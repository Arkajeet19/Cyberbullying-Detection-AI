from functools import wraps
from flask import session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

import forum


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "login required"}), 401
        return fn(*args, **kwargs)
    return wrapper


def current_user():
    user_id = session.get("user_id")
    if user_id is None:
        return None
    return forum.get_user_by_id(user_id)
