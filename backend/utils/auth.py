import os
import jwt
from functools import wraps
from flask import request, jsonify
from models.user import User


def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        return User.query.get(payload["user_id"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_role(role_name):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Unauthorised"}), 401
            if not user.has_role(role_name):
                return jsonify({"error": "Forbidden"}), 403
            return f(user, *args, **kwargs)
        return wrapper
    return decorator


def require_applicant(f):
    return require_role("applicant")(f)

def require_officer(f):
    return require_role("officer")(f)

def require_supervisor(f):
    return require_role("supervisor")(f)

def require_admin(f):
    return require_role("admin")(f)