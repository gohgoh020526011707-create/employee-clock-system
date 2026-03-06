"""查詢打卡紀錄 API

查詢參數：
  - start: 開始日期 (YYYY-MM-DD)
  - end:   結束日期 (YYYY-MM-DD)
  - employee_id: 員工 UID(僅管理員可用)
"""

import sys
import os
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _lib.auth import authenticate, is_admin
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
            params = parse_qs(urlparse(self.path).query)

            start = params.get("start", [None])[0]
            end = params.get("end", [None])[0]
            target_uid = params.get("employee_id", [None])[0]

            if target_uid and target_uid != uid:
                if not is_admin(uid):
                    return send_error(self, 403, "僅管理員可查詢其他員工紀錄")
                uid = target_uid

            db = get_db()
            query = db.collection("attendance").where("employee_id", "==", uid)

            if start:
                query = query.where("date", ">=", start)
            if end:
                query = query.where("date", "<=", end)

            query = query.order_by("date", direction="DESCENDING")
            docs = list(query.stream())

            records = []
            for doc in docs:
                d = doc.to_dict()
                records.append({
                    "id": doc.id,
                    "date": d.get("date"),
                    "clock_in": d.get("clock_in"),
                    "clock_out": d.get("clock_out"),
                    "employee_id": d.get("employee_id"),
                })

            send_json(self, 200, {"records": records, "count": len(records)})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
