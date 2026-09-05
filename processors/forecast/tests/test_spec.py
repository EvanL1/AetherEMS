from __future__ import annotations

import pytest
from conftest import make_example_spec
from forecast_runtime_core import (
    QUARTER_HOUR_OF_DAY,
    FeatureRange,
    FeatureSpec,
    ForecastTargetSpec,
)


def test_feature_range_rejects_inverted_bounds() -> None:
    with pytest.raises(ValueError, match="minimum"):
        FeatureRange(minimum=10, maximum=5)


def test_feature_range_rejects_exclusive_maximum_below_inclusive() -> None:
    with pytest.raises(ValueError, match="exclusive maximum"):
        FeatureRange(maximum=5, maximum_exclusive=4)


def test_feature_spec_requires_name_unit_and_number_type() -> None:
    with pytest.raises(ValueError, match="name"):
        FeatureSpec(name="", unit="kW")
    with pytest.raises(ValueError, match="unit"):
        FeatureSpec(name="load", unit="")
    with pytest.raises(ValueError, match="numeric"):
        FeatureSpec(name="load", unit="kW", value_type="string")


def test_feature_spec_rejects_unknown_calendar_transform_and_provenance() -> (
    None
):
    with pytest.raises(ValueError, match="calendar transform"):
        FeatureSpec(name="x", unit="1", calendar_transform="not-a-transform")
    with pytest.raises(ValueError, match="provenance kind"):
        FeatureSpec(name="x", unit="1", provenance_kind="calendar")


def test_target_spec_requires_identity_fields() -> None:
    with pytest.raises(ValueError, match="name"):
        ForecastTargetSpec(name="", unit="kW", sign_convention="s")
    with pytest.raises(ValueError, match="unit"):
        ForecastTargetSpec(name="load", unit="", sign_convention="s")
    with pytest.raises(ValueError, match="sign_convention"):
        ForecastTargetSpec(name="load", unit="kW", sign_convention="")


def test_task_spec_requires_positive_limits() -> None:
    base = make_example_spec()
    with pytest.raises(ValueError, match="task_revision"):
        make_example_spec(task_revision=0)
    with pytest.raises(ValueError, match="positive"):
        make_example_spec(cadence_seconds=0)
    assert base.history_steps == 2


def test_task_spec_requires_history_and_future_features() -> None:
    with pytest.raises(ValueError, match="declare history and future"):
        make_example_spec(history_features=())
    with pytest.raises(ValueError, match="declare history and future"):
        make_example_spec(future_features=())


def test_task_spec_requires_target_in_history_not_future() -> None:
    with pytest.raises(ValueError, match="history feature"):
        make_example_spec(
            target=ForecastTargetSpec(
                name="net", unit="kW", sign_convention="s"
            )
        )
    with pytest.raises(ValueError, match="future feature"):
        make_example_spec(
            future_features=(
                FeatureSpec(name="load", unit="kW"),
                FeatureSpec(
                    name="quarter_hour",
                    unit="1",
                    calendar_transform=QUARTER_HOUR_OF_DAY,
                ),
            )
        )


def test_task_spec_requires_persistence_feature_in_history() -> None:
    with pytest.raises(ValueError, match="persistence source feature"):
        make_example_spec(persistence_source_feature="net")
