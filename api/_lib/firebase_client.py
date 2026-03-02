"""Firebase Admin SDK 初始化模組（單例模式）"""

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth

_initialized = False


def _ensure_initialized():
    global _initialized
    if _initialized:
        return

    cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not cred_json:
        raise RuntimeError("缺少環境變數 FIREBASE_SERVICE_ACCOUNT")

    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    _initialized = True


def get_db():
    _ensure_initialized()
    return firestore.client()


def verify_id_token(token):
    _ensure_initialized()
    return fb_auth.verify_id_token(token)


def get_user(uid):
    _ensure_initialized()
    return fb_auth.get_user(uid)


def create_user(email, password, display_name):
    _ensure_initialized()
    return fb_auth.create_user(
        email=email,
        password=password,
        display_name=display_name,
    )


def delete_user(uid):
    _ensure_initialized()
    fb_auth.delete_user(uid)
