import os
from functools import wraps

from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

import forum

SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-in-production")
TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60  # 30 days

_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="cyberguard-auth")


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)


def generate_token(user_id):
    """Stateless, signed token -- no server-side session storage needed.
    Chosen over cookies because the frontend (Vercel) and backend (Render)
    are different domains, and cross-site cookies get silently blocked by
    default in Safari and an increasing share of Chrome installs."""
    return _serializer.dumps({"user_id": user_id})


def verify_token(token):
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
        return data.get("user_id")
    except (BadSignature, SignatureExpired):
        return None


def _extract_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):].strip()
    return None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token or verify_token(token) is None:
            return jsonify({"error": "login required"}), 401
        return fn(*args, **kwargs)
    return wrapper


def current_user():
    token = _extract_token()
    if not token:
        return None
    user_id = verify_token(token)
    if user_id is None:
        return None
    return forum.get_user_by_id(user_id)