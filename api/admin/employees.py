"""員工管理 API(僅管理員可用)

GET  - 取得所有員工列表
POST - 新增員工
PUT  - 更新員工資料（薪資等）
DELETE - 刪除員工（查詢參數 uid)
"""

import sys
import os
import json
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from _lib.auth import authenticate, is_admin
from _lib.firebase_client import get_db, create_user, delete_user
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
            docs = list(db.collection("employees").stream())
            employees = []
            for doc in docs:
                data = doc.to_dict()
                data["uid"] = doc.id
                employees.append(data)

            send_json(self, 200, {"employees": employees})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")

    def do_POST(self):
        try:
            decoded = self._require_admin()
            if not decoded:
                return

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            email = body.get("email")
            password = body.get("password")
            name = body.get("name")
            department = body.get("department", "")
            role = body.get("role", "employee")

            if not all([email, password, name]):
                return send_error(self, 400, "必填欄位：email, password, name")

            if role not in ("admin", "employee"):
                return send_error(self, 400, "role 必須為 admin 或 employee")

            try:
                user_record = create_user(email, password, name)
            except Exception as e:
                return send_error(self, 400, f"建立帳號失敗：{e}")

            db = get_db()
            now = datetime.now(TZ).isoformat()
            salary_type = body.get("salary_type", "full_time")
            monthly_salary = body.get("monthly_salary", 0)
            hourly_rate = body.get("hourly_rate", 0)

            employee_data = {
                "name": name,
                "email": email,
                "department": department,
                "role": role,
                "salary_type": salary_type,
                "monthly_salary": monthly_salary,
                "hourly_rate": hourly_rate,
                "created_at": now,
            }
            db.collection("employees").document(user_record.uid).set(employee_data)

            employee_data["uid"] = user_record.uid
            send_json(self, 201, {"message": "員工新增成功", "employee": employee_data})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")

    def do_PUT(self):
        try:
            decoded = self._require_admin()
            if not decoded:
                return

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            target_uid = body.get("uid")
            if not target_uid:
                return send_error(self, 400, "缺少 uid")

            db = get_db()
            doc_ref = db.collection("employees").document(target_uid)
            doc = doc_ref.get()
            if not doc.exists:
                return send_error(self, 404, "找不到此員工")

            update_data = {}
            for field in ["name", "department", "salary_type", "monthly_salary", "hourly_rate", "salary_effective_date"]:
                if field in body:
                    update_data[field] = body[field]

            if not update_data:
                return send_error(self, 400, "未提供要更新的欄位")

            doc_ref.update(update_data)
            updated = doc_ref.get().to_dict()
            updated["uid"] = target_uid
            send_json(self, 200, {"message": "員工資料已更新", "employee": updated})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")

    def do_DELETE(self):
        try:
            decoded = self._require_admin()
            if not decoded:
                return

            from urllib.parse import urlparse, parse_qs
            params = parse_qs(urlparse(self.path).query)
            target_uid = params.get("uid", [None])[0]

            if not target_uid:
                return send_error(self, 400, "缺少參數 uid")

            if target_uid == decoded["uid"]:
                return send_error(self, 400, "不可刪除自己的帳號")

            db = get_db()
            doc = db.collection("employees").document(target_uid).get()
            if not doc.exists:
                return send_error(self, 404, "找不到此員工")

            try:
                delete_user(target_uid)
            except Exception:
                pass

            db.collection("employees").document(target_uid).delete()
            send_json(self, 200, {"message": "員工已刪除"})
        except Exception as e:
            return send_error(self, 500, f"伺服器錯誤：{str(e)}")
