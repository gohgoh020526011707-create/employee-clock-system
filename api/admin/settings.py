"""系統設定 API（僅管理員可用）

GET  - 取得 IP 白名單設定
POST - 更新 IP 白名單
"""

import sys
import os
import json
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from _lib.auth import authenticate, is_admin
from _lib.firebase_client import get_db
from _lib.response import send_json, send_error, handle_cors_preflight

TZ = timezone(timedelta(hours=8))


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_cors_preflight(self)

    def _require_admin(self):
        decoded, err = authenticate(dict(self.headers))
        if err:
            send_error(self, 401, err)
            return None
        if not is_admin(decoded["uid"]):
            send_error(self, 403, "此操作僅限管理員")
            return None
        return decoded

    def do_GET(self):
        try:
            if not self._require_admin():
                return

            db = get_db()
            doc = db.collection("settings").document("ip_whitelist").get()

            if not doc.exists:
                return send_json(self, 200, {"allowed_ips": [], "updated_at": None})

            send_json(self, 200, doc.to_dict())
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")

    def do_POST(self):
        try:
            if not self._require_admin():
                return

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            allowed_ips = body.get("allowed_ips")
            if not isinstance(allowed_ips, list):
                return send_error(self, 400, "allowed_ips 必須為陣列")

            for ip in allowed_ips:
                if not isinstance(ip, str) or not ip.strip():
                    return send_error(self, 400, "IP 位址格式不正確")

            allowed_ips = [ip.strip() for ip in allowed_ips]

            db = get_db()
            now = datetime.now(TZ).isoformat()
            data = {
                "allowed_ips": allowed_ips,
                "updated_at": now,
            }
            db.collection("settings").document("ip_whitelist").set(data)

            send_json(self, 200, {"message": "IP 白名單已更新", **data})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
