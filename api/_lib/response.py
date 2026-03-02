"""HTTP 回應輔助模組"""

import json

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def send_json(handler, status_code, data):
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    for key, value in CORS_HEADERS.items():
        handler.send_header(key, value)
    handler.end_headers()
    body = json.dumps(data, ensure_ascii=False, default=str)
    handler.wfile.write(body.encode("utf-8"))


def send_error(handler, status_code, message):
    send_json(handler, status_code, {"error": message})


def handle_cors_preflight(handler):
    handler.send_response(204)
    for key, value in CORS_HEADERS.items():
        handler.send_header(key, value)
    handler.end_headers()
