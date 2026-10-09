from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
from forecast_runtime_core.artifacts import (
    CommissionedArtifactBundle,
    compute_artifact_bundle_digest,
    load_commissioned_artifact_bundles_from_env,
)
from forecast_runtime_core.backend import (
    EngineUnavailableError,
    ForecastContext,
    LegacyEdgePlatformForecastBackend,
)

ARTIFACT_BUNDLES_ENV = "AETHER_FORECAST_ARTIFACT_BUNDLES"


def make_engine(service, **kwargs):
    return LegacyEdgePlatformForecastBackend(
        service,
        forecast_type="forecast",
        default_horizons={},
        backend_id="legacy-edge-platform",
        **kwargs,
    )


class RecordingInferenceService:
    def __init__(self, result: dict[str, Any]) -> None:
        self.result = result
        self.calls: list[tuple[dict[str, Any], dict[str, Any]]] = []

    def run_inference(
        self, pre_out: dict[str, Any], raw_event: dict[str, Any]
    ) -> dict[str, Any]:
        self.calls.append((pre_out, raw_event))
        return self.result


def context() -> ForecastContext:
    return ForecastContext(
        request_id="0190aee6-2139-7a87-8448-806f1b843201",
        binding_id="site-a",
        as_of="2099-07-11T12:00:00Z",
        cadence_seconds=900,
        horizon_steps=2,
        artifact_kind="model",
        artifact_family="site-load",
        artifact_version="v3",
        quantiles=(),
    )


def commissioned_bundle(tmp_path: Path) -> CommissionedArtifactBundle:
    files = {
        "model": tmp_path / "load.onnx",
        "scaler": tmp_path / "load-scaler.json",
        "config": tmp_path / "load-config.json",
    }
    files["model"].write_bytes(b"commissioned model bytes")
    files["scaler"].write_bytes(b'{"mean": 12.5, "scale": 2.0}')
    files["config"].write_bytes(b'{"features": ["load", "temp_avg"]}')
    expected_digest = compute_artifact_bundle_digest(files)
    return CommissionedArtifactBundle(
        files=files, expected_digest=expected_digest
    )


def resolver_for(bundle: CommissionedArtifactBundle):
    def resolve(_context):
        return bundle.files

    return resolve


def test_edge_platform_adapter_only_passes_request_data_in_memory(
    tmp_path: Path,
) -> None:
    service = RecordingInferenceService(
        {
            "statusCode": 200,
            "body": {
                "model_version": "v3",
                "predictions": [
                    {"ts": "2099-07-11T12:15:00Z", "value": 836.0},
                    {"ts": "2099-07-11T12:30:00Z", "value": 837.0},
                ],
            },
        }
    )
    bundle = commissioned_bundle(tmp_path)
    engine = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: True,
    )
    history = [{"datetime": "2099-07-11T11:45:00Z", "load": 835.0}]
    forecast = [
        {"datetime": "2099-07-11T12:15:00Z", "quarter_hour": 49},
        {"datetime": "2099-07-11T12:30:00Z", "quarter_hour": 50},
    ]

    result = engine.forecast(
        history_data=history, forecast_data=forecast, context=context()
    )

    assert [point.value for point in result.points] == [836.0, 837.0]
    assert result.artifact is not None
    assert result.artifact.artifact_digest == bundle.actual_digest
    pre_out, raw_event = service.calls[0]
    assert pre_out == {
        "ok": True,
        "plant_id": "site-a",
        "forecast_type": "forecast",
        "horizon": "custom",
        "as_of": "2099-07-11T12:00:00Z",
        "data": {"history": history, "forecast": forecast},
    }
    assert raw_event == {
        "plant_id": "site-a",
        "forecast_type": "forecast",
        "horizon": "custom",
        "as_of": "2099-07-11T12:00:00Z",
        "model_version": "v3",
    }


def test_edge_platform_adapter_rejects_uncommissioned_artifact_selection() -> (
    None
):
    service = RecordingInferenceService(
        {
            "statusCode": 200,
            "body": {
                "model_version": "v3",
                "predictions": [
                    {"ts": "2099-07-11T12:15:00Z", "value": 836.0},
                    {"ts": "2099-07-11T12:30:00Z", "value": 837.0},
                ],
            },
        }
    )

    with pytest.raises(EngineUnavailableError, match="not commissioned"):
        make_engine(service).forecast(
            history_data=[{"datetime": "2099-07-11T11:45:00Z", "load": 835.0}],
            forecast_data=[
                {"datetime": "2099-07-11T12:15:00Z"},
                {"datetime": "2099-07-11T12:30:00Z"},
            ],
            context=context(),
        )


def test_edge_platform_adapter_rejects_legacy_zero_fallback(
    tmp_path: Path,
) -> None:
    service = RecordingInferenceService(
        {
            "statusCode": 200,
            "body": {
                "model_version": "v3",
                "note": "BASELINE_FALLBACK (historical_average): model failed",
                "predictions": [
                    {"ts": "2099-07-11T12:15:00Z", "value": 0.0},
                    {"ts": "2099-07-11T12:30:00Z", "value": 0.0},
                ],
            },
        }
    )

    with pytest.raises(EngineUnavailableError, match="legacy fallback"):
        bundle = commissioned_bundle(tmp_path)
        make_engine(
            service,
            artifact_bundles={("model", "site-load", "v3"): bundle},
            artifact_file_resolver=resolver_for(bundle),
            readiness_probe=lambda: True,
        ).forecast(
            history_data=[{"datetime": "2099-07-11T11:45:00Z", "load": 835.0}],
            forecast_data=[
                {"datetime": "2099-07-11T12:15:00Z"},
                {"datetime": "2099-07-11T12:30:00Z"},
            ],
            context=context(),
        )


def test_edge_platform_adapter_rejects_failed_or_malformed_response(
    tmp_path: Path,
) -> None:
    failed = RecordingInferenceService({"statusCode": 500, "body": "{}"})
    malformed = RecordingInferenceService(
        {"statusCode": 200, "body": {"predictions": []}}
    )

    for service in (failed, malformed):
        bundle = commissioned_bundle(tmp_path)
        with pytest.raises(EngineUnavailableError):
            make_engine(
                service,
                artifact_bundles={("model", "site-load", "v3"): bundle},
                artifact_file_resolver=resolver_for(bundle),
                readiness_probe=lambda: True,
            ).forecast(
                history_data=[
                    {"datetime": "2099-07-11T11:45:00Z", "load": 835.0}
                ],
                forecast_data=[
                    {"datetime": "2099-07-11T12:15:00Z"},
                    {"datetime": "2099-07-11T12:30:00Z"},
                ],
                context=context(),
            )


def test_edge_platform_adapter_parses_json_body_and_local_artifact_digest(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    body = {
        "model_version": "v3",
        "artifact_digest": bundle.actual_digest,
        "predictions": [
            {"ts": "2099-07-11T12:15:00Z", "value": 836},
            {"ts": "2099-07-11T12:30:00Z", "value": 837},
        ],
    }
    service = RecordingInferenceService(
        {"statusCode": 200, "body": json.dumps(body)}
    )

    result = make_engine(
        service,
        horizon_names={(900, 2): "test_horizon"},
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: True,
    ).forecast(
        history_data=[{"datetime": "2099-07-11T11:45:00Z", "load": 835.0}],
        forecast_data=[
            {"datetime": "2099-07-11T12:15:00Z"},
            {"datetime": "2099-07-11T12:30:00Z"},
        ],
        context=context(),
    )

    assert result.artifact is not None
    assert result.artifact.artifact_digest == bundle.actual_digest
    assert service.calls[0][0]["horizon"] == "test_horizon"


@pytest.mark.parametrize(
    "invalid_context",
    [
        replace(context(), artifact_version=None),
        replace(context(), quantiles=(0.5,)),
    ],
)
def test_edge_platform_adapter_rejects_unsupported_selection(
    invalid_context: ForecastContext,
) -> None:
    service = RecordingInferenceService({"statusCode": 200, "body": {}})

    with pytest.raises(EngineUnavailableError):
        make_engine(service).forecast(
            history_data=[], forecast_data=[], context=invalid_context
        )


@pytest.mark.parametrize(
    "body",
    [
        "not-json",
        [],
        {"predictions": ["wrong"]},
        {"predictions": [{"ts": 42, "value": 1.0}]},
        {"predictions": [{"ts": "2099-07-11T12:15:00Z", "value": True}]},
        {
            "predictions": [
                {"ts": "2099-07-11T12:15:00Z", "value": float("inf")}
            ]
        },
    ],
)
def test_edge_platform_adapter_rejects_unsafe_response_shapes(
    body: Any, tmp_path: Path
) -> None:
    service = RecordingInferenceService({"statusCode": 200, "body": body})
    bundle = commissioned_bundle(tmp_path)

    with pytest.raises(EngineUnavailableError):
        make_engine(
            service,
            artifact_bundles={("model", "site-load", "v3"): bundle},
            artifact_file_resolver=resolver_for(bundle),
            readiness_probe=lambda: True,
        ).forecast(
            history_data=[],
            forecast_data=[{"datetime": "2099-07-11T12:15:00Z"}],
            context=replace(context(), horizon_steps=1),
        )


def test_edge_platform_adapter_rejects_wrong_upstream_model_version(
    tmp_path: Path,
) -> None:
    service = RecordingInferenceService(
        {
            "statusCode": 200,
            "body": {
                "model_version": "v2",
                "predictions": [
                    {"ts": "2099-07-11T12:15:00Z", "value": 836.0},
                    {"ts": "2099-07-11T12:30:00Z", "value": 837.0},
                ],
            },
        }
    )
    bundle = commissioned_bundle(tmp_path)

    with pytest.raises(EngineUnavailableError, match="model version"):
        make_engine(
            service,
            artifact_bundles={("model", "site-load", "v3"): bundle},
            artifact_file_resolver=resolver_for(bundle),
            readiness_probe=lambda: True,
        ).forecast(
            history_data=[],
            forecast_data=[
                {"datetime": "2099-07-11T12:15:00Z"},
                {"datetime": "2099-07-11T12:30:00Z"},
            ],
            context=context(),
        )


def test_edge_platform_adapter_requires_artifact_path_proof(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    service = RecordingInferenceService({"statusCode": 200, "body": {}})
    engine = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
    )

    assert engine.is_ready() is False
    with pytest.raises(
        EngineUnavailableError, match="path resolution is not commissioned"
    ):
        engine.forecast(history_data=[], forecast_data=[], context=context())
    assert service.calls == []


def test_edge_platform_adapter_requires_legacy_readiness_gate(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    service = RecordingInferenceService({"statusCode": 200, "body": {}})
    engine = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
    )

    assert engine.is_ready() is False
    with pytest.raises(
        EngineUnavailableError, match="readiness probe is not commissioned"
    ):
        engine.forecast(history_data=[], forecast_data=[], context=context())
    assert service.calls == []


def test_edge_platform_adapter_rejects_resolved_paths_outside_bundle(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    other_model = tmp_path / "other.onnx"
    other_model.write_bytes(b"different model")
    service = RecordingInferenceService({"statusCode": 200, "body": {}})
    engine = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=lambda _context: {
            **bundle.files,
            "model": other_model,
        },
        readiness_probe=lambda: True,
    )

    with pytest.raises(EngineUnavailableError, match="paths do not match"):
        engine.forecast(history_data=[], forecast_data=[], context=context())
    assert service.calls == []


def test_edge_platform_health_requires_legacy_probe(tmp_path: Path) -> None:
    bundle = commissioned_bundle(tmp_path)
    service = RecordingInferenceService({"statusCode": 200, "body": {}})
    healthy = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: True,
    )
    unhealthy = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: False,
    )

    assert healthy.is_ready() is True
    assert unhealthy.is_ready() is False

    raising = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: 1 / 0,
    )
    assert raising.is_ready() is False


def test_edge_platform_adapter_rejects_failed_resolver_and_readiness(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    service = RecordingInferenceService({"statusCode": 200, "body": {}})

    def resolver_failure(_context):
        raise RuntimeError("private resolver detail")

    bad_resolver = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_failure,
        readiness_probe=lambda: True,
    )
    not_ready = make_engine(
        service,
        artifact_bundles={("model", "site-load", "v3"): bundle},
        artifact_file_resolver=resolver_for(bundle),
        readiness_probe=lambda: False,
    )

    with pytest.raises(EngineUnavailableError, match="path resolution failed"):
        bad_resolver.forecast(
            history_data=[], forecast_data=[], context=context()
        )
    with pytest.raises(EngineUnavailableError, match="not ready"):
        not_ready.forecast(history_data=[], forecast_data=[], context=context())
    assert service.calls == []


def test_edge_platform_adapter_rejects_reported_digest_disagreement(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    service = RecordingInferenceService(
        {
            "statusCode": 200,
            "body": {
                "model_version": "v3",
                "artifact_digest": "sha256:" + "f" * 64,
                "predictions": [
                    {"ts": "2099-07-11T12:15:00Z", "value": 836.0},
                    {"ts": "2099-07-11T12:30:00Z", "value": 837.0},
                ],
            },
        }
    )

    with pytest.raises(EngineUnavailableError, match="digest does not match"):
        make_engine(
            service,
            artifact_bundles={("model", "site-load", "v3"): bundle},
            artifact_file_resolver=resolver_for(bundle),
            readiness_probe=lambda: True,
        ).forecast(
            history_data=[],
            forecast_data=[
                {"datetime": "2099-07-11T12:15:00Z"},
                {"datetime": "2099-07-11T12:30:00Z"},
            ],
            context=context(),
        )


def test_commissioned_bundle_fails_closed_on_digest_mismatch(
    tmp_path: Path,
) -> None:
    model = tmp_path / "model.onnx"
    model.write_bytes(b"actual bytes")

    with pytest.raises(ValueError, match="digest"):
        CommissionedArtifactBundle(
            files={"model": model},
            expected_digest="sha256:" + "0" * 64,
        )


def test_commissioned_bundle_detects_file_replacement_after_startup(
    tmp_path: Path,
) -> None:
    bundle = commissioned_bundle(tmp_path)
    model_path = bundle.files["model"]
    model_path.write_bytes(b"changed model bytes")

    with pytest.raises(EngineUnavailableError, match="changed after commissioning"):
        bundle.verify_unchanged()


def test_artifact_bundles_load_from_strict_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    files = {"model": tmp_path / "model.onnx"}
    files["model"].write_bytes(b"model")
    digest = compute_artifact_bundle_digest(files)
    monkeypatch.setenv(
        "AETHER_FORECAST_ARTIFACT_BUNDLES",
        json.dumps(
            [
                {
                    "kind": "model",
                    "family": "site-load",
                    "version": "v3",
                    "expected_digest": digest,
                    "files": {"model": str(files["model"])},
                }
            ]
        ),
    )

    bundles = load_commissioned_artifact_bundles_from_env(ARTIFACT_BUNDLES_ENV)

    assert bundles[("model", "site-load", "v3")].actual_digest == digest


def test_artifact_environment_is_required_and_rejects_unknown_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AETHER_FORECAST_ARTIFACT_BUNDLES", raising=False)
    with pytest.raises(ValueError, match="ARTIFACT_BUNDLES"):
        load_commissioned_artifact_bundles_from_env(
            ARTIFACT_BUNDLES_ENV, required=True
        )

    monkeypatch.setenv(
        "AETHER_FORECAST_ARTIFACT_BUNDLES",
        '[{"kind":"model","family":"site-load","version":"v3",'
        '"expected_digest":"sha256:'
        + "0" * 64
        + '","files":{},"unexpected":true}]',
    )
    with pytest.raises(ValueError, match="fields"):
        load_commissioned_artifact_bundles_from_env(ARTIFACT_BUNDLES_ENV)


def test_artifact_environment_can_be_optional_and_rejects_invalid_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AETHER_FORECAST_ARTIFACT_BUNDLES", raising=False)
    assert (
        load_commissioned_artifact_bundles_from_env(
            ARTIFACT_BUNDLES_ENV, required=False
        )
        == {}
    )

    monkeypatch.setenv("AETHER_FORECAST_ARTIFACT_BUNDLES", "")
    assert (
        load_commissioned_artifact_bundles_from_env(
            ARTIFACT_BUNDLES_ENV, required=False
        )
        == {}
    )
    with pytest.raises(ValueError, match="ARTIFACT_BUNDLES"):
        load_commissioned_artifact_bundles_from_env(
            ARTIFACT_BUNDLES_ENV, required=True
        )

    monkeypatch.setenv("AETHER_FORECAST_ARTIFACT_BUNDLES", "not-json")
    with pytest.raises(ValueError, match="valid JSON"):
        load_commissioned_artifact_bundles_from_env(ARTIFACT_BUNDLES_ENV)
