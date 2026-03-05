"""國定假日管理 API（僅管理員可用）

GET  - 取得所有國定假日
POST - 新增/更新國定假日列表
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
            doc = db.collection("settings").document("holidays").get()

            if not doc.exists:
                return send_json(self, 200, {"dates": []})

            data = doc.to_dict()
            send_json(self, 200, {"dates": data.get("dates", []), "names": data.get("names", {})})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")

    def do_POST(self):
        try:
            if not self._require_admin():
                return

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            dates = body.get("dates")
            if not isinstance(dates, list):
                return send_error(self, 400, "dates 必須為陣列")

            for d in dates:
                if not isinstance(d, str) or len(d) != 10:
                    return send_error(self, 400, f"日期格式不正確：{d}，需為 YYYY-MM-DD")

            dates = sorted(set(dates))
            names = body.get("names", {})
            if not isinstance(names, dict):
                names = {}

            db = get_db()
            now = datetime.now(TZ).isoformat()
            data = {"dates": dates, "names": names, "updated_at": now}
            db.collection("settings").document("holidays").set(data)

            send_json(self, 200, {"message": "國定假日已更新", "dates": dates, "names": names})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
