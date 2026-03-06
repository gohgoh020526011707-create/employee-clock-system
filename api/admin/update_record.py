"""修改出勤紀錄 API(僅管理員可用)

POST - 修改指定出勤紀錄的上班/下班時間
"""

import sys
import os
import json
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from _lib.auth import authenticate, is_admin
from _lib.firebase_client import get_db
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

            record_id = body.get("record_id")
            clock_in = body.get("clock_in")
            clock_out = body.get("clock_out")

            if not record_id:
                return send_error(self, 400, "缺少 record_id")

            db = get_db()
            doc_ref = db.collection("attendance").document(record_id)
            doc = doc_ref.get()

            if not doc.exists:
                return send_error(self, 404, "找不到此出勤紀錄")

            update_data = {}
            if clock_in is not None:
                update_data["clock_in"] = clock_in
            if clock_out is not None:
                update_data["clock_out"] = clock_out if clock_out else None

            if not update_data:
                return send_error(self, 400, "未提供要修改的欄位")

            doc_ref.update(update_data)

            updated = doc_ref.get().to_dict()
            updated["id"] = record_id
            send_json(self, 200, {"message": "出勤紀錄已更新", "record": updated})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
