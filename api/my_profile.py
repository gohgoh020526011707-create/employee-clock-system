"""員工個人資料 API

GET - 取得目前登入員工的個人資料（含薪資資訊）
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

            uid = decoded["uid"]
            db = get_db()
            doc = db.collection("employees").document(uid).get()

            if not doc.exists:
                return send_error(self, 404, "找不到員工資料")

            data = doc.to_dict()
            data["uid"] = uid
            send_json(self, 200, {"profile": data})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
