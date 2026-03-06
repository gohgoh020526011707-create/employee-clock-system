"""國定假日查詢 API(所有登入使用者可用)

GET - 取得國定假日列表
"""

import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _lib.auth import authenticate
from _lib.firebase_client import get_db
from _lib.response import send_json, send_error, handle_cors_preflight


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_cors_preflight(self)

    def do_GET(self):
        try:
            decoded, err = authenticate(dict(self.headers))
            if err:
                return send_error(self, 401, err)

            db = get_db()
            doc = db.collection("settings").document("holidays").get()

            if not doc.exists:
                return send_json(self, 200, {"dates": []})

            data = doc.to_dict()
            send_json(self, 200, {"dates": data.get("dates", []), "names": data.get("names", {})})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
