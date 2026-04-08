from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timezone, timedelta
from config.extensions import db
from models.user import User
from models.role import Role
from models.user_role import User_role
from models.licence_record import LicenceRecord
from models.applicant_profile import Profile
import jwt
import os

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def generate_token(user):
    payload = {
        "user_id": user.id,
        "email": user.email,
        "roles": [r.name for r in user.roles],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")


def user_response(user, token):
    profile = user.profile
    officer = user.officerprofile
    supervisor = user.supervisorprofile

    name = None
    if profile:
        name = f"{profile.firstname} {profile.lastname}"
    elif officer:
        name = f"{officer.firstname} {officer.lastname}"
    elif supervisor:
        name = f"{supervisor.firstname} {supervisor.lastname}"

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": name,
            "roles": [r.name for r in user.roles],
            "role": user.roles[0].name if user.roles else None,
        }
    }


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated"}), 403

    token = generate_token(user)
    return jsonify(user_response(user, token)), 200


@auth_bp.route("/register/verify", methods=["POST"])
def register_verify():
    data = request.get_json()
    trn = data.get("trn", "").strip()
    dob = data.get("date_of_birth", "").strip()
    control_number = data.get("control_number", "").strip()

    if not trn or not dob or not control_number:
        return jsonify({"error": "TRN, date of birth and control number are required"}), 400

    try:
        dob_parsed = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date of birth format"}), 400

    licence = LicenceRecord.query.filter_by(
        trn=trn,
        control_number=control_number
    ).first()

    if not licence:
        return jsonify({"error": "No licence found matching these details"}), 404

    if licence.date_of_birth != dob_parsed:
        return jsonify({"error": "No licence found matching these details"}), 404

    if licence.user_id_fk:
        return jsonify({"error": "An account already exists for this TRN"}), 409

    return jsonify({
        "verified": True,
        "licence": {
            "trn": licence.trn,
            "firstname": licence.firstname,
            "lastname": licence.lastname,
            "date_of_birth": str(licence.date_of_birth),
            "sex": licence.sex,
            "licence_class": licence.licence_class,
            "collectorate": licence.collectorate,
            "expiry_date": str(licence.expiry_date),
            "status": licence.status,
            "address_line1": licence.address_line1,
            "address_line2": licence.address_line2,
            "parish": licence.parish,
        }
    }), 200


@auth_bp.route("/register/complete", methods=["POST"])
def register_complete():
    data = request.get_json()
    trn = data.get("trn", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    phone = data.get("phone", "").strip()

    if not all([trn, email, password, confirm_password]):
        return jsonify({"error": "All fields are required"}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    licence = LicenceRecord.query.filter_by(trn=trn).first()
    if not licence:
        return jsonify({"error": "Licence record not found"}), 404

    if licence.user_id_fk:
        return jsonify({"error": "An account already exists for this TRN"}), 409

    applicant_role = Role.query.filter_by(name="applicant").first()

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        is_active=True
    )
    db.session.add(user)
    db.session.flush()

    db.session.add(User_role(
        user_id=user.id,
        role_id=applicant_role.id
    ))

    db.session.add(Profile(
        user_id_fk=user.id,
        firstname=licence.firstname,
        lastname=licence.lastname,
        date_of_birth=licence.date_of_birth,
        nat_id=licence.trn,
        phone=phone,
        email=email,
        occupation=licence.occupation,
        address_line1=licence.address_line1,
        address_line2=licence.address_line2,
        parish=licence.parish,
        sex=licence.sex,
        photo=None
    ))

    licence.user_id_fk = user.id
    db.session.commit()

    token = generate_token(user)
    return jsonify(user_response(user, token)), 201


@auth_bp.route("/me", methods=["GET"])
def me():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=["HS256"]
        )
        user = User.query.get(payload["user_id"])
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user_response(user, token)), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401