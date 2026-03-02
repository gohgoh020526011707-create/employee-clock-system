"""打卡上班 API"""

import sys
import os
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _lib.auth import authenticate
from _lib.ip_guard import get_client_ip, is_ip_allowed
from _lib.firebase_client import get_db
from _lib.response import send_json, send_error, handle_cors_preflight

TZ = timezone(timedelta(hours=8))


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_cors_preflight(self)

    def do_POST(self):
        decoded, err = authenticate(dict(self.headers))
        if err:
            return send_error(self, 401, err)

        client_ip = get_client_ip(dict(self.headers))
        if not is_ip_allowed(client_ip):
            return send_error(self, 403, f"IP 位址不在允許範圍內：{client_ip}")

        uid = decoded["uid"]
        now = datetime.now(TZ)
        today = now.strftime("%Y-%m-%d")

        db = get_db()

        existing = list(
            db.collection("attendance")
            .where("employee_id", "==", uid)
            .where("date", "==", today)
            .limit(1)
            .stream()
        )
        if existing:
            return send_error(self, 409, "今日已打卡上班")

        record = {
            "employee_id": uid,
            "date": today,
            "clock_in": now.isoformat(),
            "clock_out": None,
            "ip": client_ip,
            "created_at": now.isoformat(),
        }
        db.collection("attendance").add(record)

        send_json(self, 200, {"message": "打卡上班成功", "record": record})
