from __future__ import annotations

import json

import pytest
from conftest import make_example_spec
from forecast_runtime_core import (
    CommissionedArtifactBundle,
    compute_artifact_bundle_digest,
)

from aether_forecast_processor import (
    ForecastProcessor,
    create_backend_registry,
    create_processor_from_bindings,
    create_processor_from_env,
    load_backend_bindings_from_env,
)


def test_create_processor_from_bindings_uses_binding_specific_backend() -> None:
    bindings = load_backend_bindings_from_env(required=False)
    bindings = type(bindings).from_mappings(
        [
            {
                "task_id": "energy.site-load-forecast",
                "task_revision": 1,
                "binding_id": "site-a",
                "backend_kind": "remote-http",
                "backend_config": {
                    "base_url": "https://site-a.example",
                    "backend_id": "site-a-remote",
                },
            }
        ]
    )

    processor = create_processor_from_bindings(
        spec=make_example_spec(),
        binding_id="site-a",
        backend_bindings=bindings,
    )

    assert isinstance(processor, ForecastProcessor)
    assert processor.is_ready() is False
    assert processor._engine.descriptor().backend_id == "site-a-remote"


def test_create_processor_from_env_reads_binding_rules(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "AETHER_FORECAST_BACKEND_BINDINGS",
        json.dumps(
            [
                {
                    "task_id": "energy.site-load-forecast",
                    "task_revision": 1,
                    "binding_id": None,
                    "backend_kind": "remote-http",
                    "backend_config": {
                        "base_url": "https://default.example",
                        "backend_id": "default-remote",
                    },
                }
            ]
        ),
    )

    bindings = load_backend_bindings_from_env(required=True)
    processor = create_processor_from_env(
        spec=make_example_spec(),
        binding_id="site-b",
    )

    assert (
        bindings.resolve(
            task_id="energy.site-load-forecast",
            task_revision=1,
            binding_id="site-b",
        ).backend_config["base_url"]
        == "https://default.example"
    )
    assert processor._engine.descriptor().backend_id == "default-remote"


class RecordingInferenceService:
    def run_inference(self, pre_out, raw_event):
        return {
            "statusCode": 200,
            "body": {
                "model_version": raw_event["model_version"],
                "artifact_digest": "sha256:" + "d" * 64,
                "predictions": [
                    {"ts": row["datetime"], "value": 100.0 + index}
                    for index, row in enumerate(pre_out["data"]["forecast"])
                ],
            },
        }


def test_same_task_can_switch_between_remote_and_legacy_backends(
    tmp_path,
) -> None:
    model = tmp_path / "model.onnx"
    model.write_bytes(b"legacy model bytes")
    bundle = CommissionedArtifactBundle(
        files={"model": model},
        expected_digest=compute_artifact_bundle_digest({"model": model}),
    )
    registry = create_backend_registry(
        legacy_inference_service=RecordingInferenceService(),
        legacy_artifact_bundles={("model", "site-load", "v3"): bundle},
        legacy_artifact_file_resolver=lambda _context: bundle.files,
        legacy_readiness_probe=lambda: True,
    )
    bindings = type(
        load_backend_bindings_from_env(required=False)
    ).from_mappings(
        [
            {
                "task_id": "energy.site-load-forecast",
                "task_revision": 1,
                "binding_id": "site-remote",
                "backend_kind": "remote-http",
                "backend_config": {
                    "base_url": "https://remote.example",
                    "backend_id": "remote-choice",
                },
            },
            {
                "task_id": "energy.site-load-forecast",
                "task_revision": 1,
                "binding_id": "site-legacy",
                "backend_kind": "legacy-edge-platform",
                "backend_config": {},
            },
        ]
    )

    remote_processor = create_processor_from_bindings(
        spec=make_example_spec(),
        binding_id="site-remote",
        backend_bindings=bindings,
        registry=registry,
    )
    legacy_processor = create_processor_from_bindings(
        spec=make_example_spec(),
        binding_id="site-legacy",
        backend_bindings=bindings,
        registry=registry,
    )

    assert remote_processor._engine.descriptor().backend_id == "remote-choice"
    assert (
        legacy_processor._engine.descriptor().backend_id
        == "legacy-edge-platform"
    )
