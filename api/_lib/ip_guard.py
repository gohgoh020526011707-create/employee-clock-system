"""WiFi IP 白名單驗證模組"""

from .firebase_client import get_db


def get_client_ip(headers):
    """從請求標頭中取得客戶端真實 IP"""
    forwarded = headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = headers.get("x-real-ip", "")
    if real_ip:
        return real_ip.strip()

    return None


def is_ip_allowed(ip):
    """檢查 IP 是否在允許的白名單內"""
    if not ip:
        return False

    db = get_db()
    doc = db.collection("settings").document("ip_whitelist").get()

    if not doc.exists:
        return False

    allowed_ips = doc.to_dict().get("allowed_ips", [])
    return ip in allowed_ips
