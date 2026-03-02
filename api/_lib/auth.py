"""認證與權限驗證模組"""

from .firebase_client import verify_id_token, get_db


def authenticate(headers):
    """驗證 Bearer token，回傳 (decoded_token, error_message)"""
    lower_headers = {k.lower(): v for k, v in headers.items()}
    auth_header = lower_headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "未提供認證令牌"

    token = auth_header[7:]
    try:
        decoded = verify_id_token(token)
        return decoded, None
    except Exception:
        return None, "認證令牌無效或已過期"


def is_admin(uid):
    """檢查使用者是否為管理員"""
    db = get_db()
    doc = db.collection("employees").document(uid).get()
    if not doc.exists:
        return False
    return doc.to_dict().get("role") == "admin"
