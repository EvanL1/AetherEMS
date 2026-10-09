"""Protocol models for the Chronos-style remote forecast skeleton."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ArtifactSelectorModel(BaseModel):
    """Selector for a commissioned model artifact."""

    kind: str
    family: str
    version: str


class QuantileModel(BaseModel):
    """A probability and its forecast value."""

    probability: float
    value: float


class ForecastPointModel(BaseModel):
    """A single timestamped forecast point."""

    timestamp: str
    value: float
    quantiles: list[QuantileModel] = Field(default_factory=list)


class ForecastRequestModel(BaseModel):
    """The foundation-model forecast request body."""

    request_id: str
    binding_id: str
    as_of: str
    cadence_seconds: int
    horizon_steps: int
    artifact: ArtifactSelectorModel | None = None
    quantiles: list[float] = Field(default_factory=list)
    history_data: list[dict[str, Any]]
    forecast_data: list[dict[str, Any]]
    model_family: str
    model_name: str


class ArtifactResponseModel(BaseModel):
    """Artifact provenance echoed in the response."""

    kind: str
    family: str
    version: str
    artifact_digest: str


class ForecastResponseModel(BaseModel):
    """The foundation-model forecast response body."""

    artifact: ArtifactResponseModel | None = None
    predictions: list[ForecastPointModel]


class HealthResponseModel(BaseModel):
    """The foundation-model health response body."""

    ready: bool
    model_family: str
    model_name: str


class ErrorResponseModel(BaseModel):
    """The error response body."""

    error: dict[str, str]
