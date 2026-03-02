"""管理員帳號遷移 API（僅管理員可用）

POST - 將目前管理員的 email 改為 姓名@clock.internal
"""

import sys
import os
import json
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from _lib.auth import authenticate, is_admin
from _lib.firebase_client import get_db, update_user
from _lib.response import send_json, send_error, handle_cors_preflight


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_cors_preflight(self)

    def do_POST(self):
        try:
            decoded, err = authenticate(dict(self.headers))
            if err:
                return send_error(self, 401, err)
            if not is_admin(decoded["uid"]):
                return send_error(self, 403, "此操作僅限管理員")

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            new_name = body.get("name", "boss")
            new_email = new_name + "@clock.internal"
            uid = decoded["uid"]

            update_user(uid, email=new_email, display_name=new_name)

            db = get_db()
            db.collection("employees").document(uid).update({
                "name": new_name,
                "email": new_email,
            })

            send_json(self, 200, {
                "message": f"管理員帳號已更新，請用「{new_name}」+ 密碼登入",
                "name": new_name,
                "email": new_email,
            })
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
