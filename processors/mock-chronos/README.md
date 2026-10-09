# Mock Chronos Service

Local mock Chronos-style service for protocol demos and integration smoke
tests. It implements the `/v1/foundation/health` and `/v1/foundation/forecast`
endpoints used by `ForecastRuntimeCore`'s `ChronosRemoteExecutor`, so the
platform-to-remote-foundation-service path can be demonstrated locally before
wiring a real Chronos service.

## Files

- `mock_chronos_service.py` — the FastAPI app factory (`create_app`).
- `run_mock_chronos_service.py` — a `uvicorn` entrypoint.

## Run

```powershell
$env:AETHER_MOCK_CHRONOS_TOKEN="secret-token"
python .\processors\mock-chronos\run_mock_chronos_service.py
```
