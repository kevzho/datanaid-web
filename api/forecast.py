"""
Datanaid — Heavy ML forecasting microservice (Vercel Python runtime).

This is an OPTIONAL accelerator. The TypeScript engine already ships a linear
forecast with confidence intervals that works with zero configuration. This
Vercel function intentionally uses a pure-Python linear fallback so deployment
stays under serverless bundle/storage limits.

Vercel auto-detects files under /api/*.py as Python serverless functions and
installs api/requirements.txt. Keep api/requirements.txt empty for Vercel
Hobby/free deployments. For Prophet/XGBoost, host a separate Python service and
point PYTHON_ML_URL at it.

Contract
--------
POST /api/forecast
Body: {
  "metric": "donations",
  "granularity": "month",
  "history": [{"period": "2024-01", "value": 1200.0}, ...],
  "horizon": 6,
  "confidence": 0.95,
  "method": "auto" | "prophet" | "xgboost" | "linear"
}

Response: {
  "method": "linear",
  "metric": "donations",
  "forecast": [{"period": "2024-07", "value": ..., "lower": ..., "upper": ...}, ...],
  "r2": 0.82
}
"""

from http.server import BaseHTTPRequestHandler
import json
import math


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _next_period(last: str, step: int, gran: str) -> str:
    """Mirror the TS period-label logic so periods stay consistent."""
    try:
        if gran == "month" and len(last) == 7 and "-" in last:
            y, m = last.split("-")
            y, m = int(y), int(m) - 1 + step
            y += m // 12
            m = m % 12
            return f"{y}-{m + 1:02d}"
        if gran == "year" and last.isdigit():
            return str(int(last) + step)
        if gran == "quarter" and "-Q" in last:
            y, q = last.split("-Q")
            y, q = int(y), int(q) - 1 + step
            y += q // 4
            q = q % 4
            return f"{y}-Q{q + 1}"
    except Exception:
        pass
    return f"{last}+{step}"


def _linear_forecast(history, horizon, confidence):
    """Pure-Python OLS forecast — the always-available fallback."""
    ys = [float(p["value"]) for p in history]
    n = len(ys)
    xs = list(range(n))
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs) or 1.0
    sxy = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    slope = sxy / sxx
    intercept = my - slope * mx
    fitted = [slope * x + intercept for x in xs]
    sse = sum((ys[i] - fitted[i]) ** 2 for i in range(n))
    sst = sum((y - my) ** 2 for y in ys) or 1.0
    r2 = max(0.0, 1.0 - sse / sst)
    dof = max(1, n - 2)
    se = math.sqrt(sse / dof)
    z = {0.8: 1.2816, 0.9: 1.6449, 0.95: 1.96, 0.99: 2.5758}.get(round(confidence, 2), 1.96)

    out = []
    last_period = history[-1]["period"]
    gran = "month"
    for h in range(1, horizon + 1):
        x = (n - 1) + h
        yhat = slope * x + intercept
        margin = z * se * math.sqrt(1 + 1 / n + (x - mx) ** 2 / sxx)
        out.append({
            "period": _next_period(last_period, h, gran),
            "value": max(0.0, yhat),
            "lower": max(0.0, yhat - margin),
            "upper": yhat + margin,
        })
    return out, r2


def _prophet_forecast(history, horizon, confidence, gran):
    from prophet import Prophet  # type: ignore
    import pandas as pd  # type: ignore

    freq = {"day": "D", "week": "W", "month": "MS", "quarter": "QS", "year": "YS"}.get(gran, "MS")
    # Build a datetime index from period labels.
    def to_ts(period):
        if gran == "month":
            return pd.to_datetime(period + "-01")
        if gran == "year":
            return pd.to_datetime(period + "-01-01")
        if gran == "quarter":
            y, q = period.split("-Q")
            return pd.to_datetime(f"{y}-{(int(q) - 1) * 3 + 1:02d}-01")
        return pd.to_datetime(period)

    df = pd.DataFrame({
        "ds": [to_ts(p["period"]) for p in history],
        "y": [float(p["value"]) for p in history],
    })
    m = Prophet(interval_width=confidence, weekly_seasonality=False, daily_seasonality=False)
    m.fit(df)
    future = m.make_future_dataframe(periods=horizon, freq=freq)
    fc = m.predict(future).tail(horizon)

    out = []
    last_period = history[-1]["period"]
    for i, (_, row) in enumerate(fc.iterrows(), start=1):
        out.append({
            "period": _next_period(last_period, i, gran),
            "value": max(0.0, float(row["yhat"])),
            "lower": max(0.0, float(row["yhat_lower"])),
            "upper": float(row["yhat_upper"]),
        })
    return out


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):  # noqa: N802
        _json_response(self, 200, {
            "status": "ok",
            "service": "datanaid-forecast",
            "methods": ["linear", "prophet", "xgboost"],
        })

    def do_POST(self):  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            _json_response(self, 400, {"error": "Invalid JSON body."})
            return

        history = body.get("history", [])
        if not history or len(history) < 3:
            _json_response(self, 400, {"error": "Need at least 3 history points."})
            return

        horizon = int(body.get("horizon", 6))
        confidence = float(body.get("confidence", 0.95))
        gran = body.get("granularity", "month")
        method = body.get("method", "auto")
        metric = body.get("metric", "value")

        forecast = None
        used = "linear"
        r2 = 0.0

        if method in ("auto", "prophet") and len(history) >= 6:
            try:
                forecast = _prophet_forecast(history, horizon, confidence, gran)
                used = "prophet"
            except Exception:
                forecast = None

        if forecast is None:
            forecast, r2 = _linear_forecast(history, horizon, confidence)
            used = "linear"

        _json_response(self, 200, {
            "method": used,
            "metric": metric,
            "forecast": forecast,
            "r2": r2,
        })
