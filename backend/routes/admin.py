from flask import Blueprint, jsonify, request
from config.extensions import db
from models.user import User
from models.application import Application
from models.licence_record import LicenceRecord
from models.officer_profile import OfficerProfile
from models.supervisor_profile import SupervisorProfile
from utils.auth import require_admin
from werkzeug.security import generate_password_hash
from datetime import datetime, timezone

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/users", methods=["GET"])
@require_admin
def get_users(user):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        "users": [{
            "id":         u.id,
            "email":      u.email,
            "is_active":  u.is_active,
            "roles":      [r.name for r in u.roles],
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in users]
    }), 200


@admin_bp.route("/users/<int:user_id>/deactivate", methods=["POST"])
@require_admin
def deactivate_user(user, user_id):
    target = User.query.get(user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.is_active = False
    db.session.commit()
    return jsonify({"is_active": target.is_active}), 200


@admin_bp.route("/users/<int:user_id>/activate", methods=["POST"])
@require_admin
def activate_user(user, user_id):
    target = User.query.get(user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.is_active = True
    db.session.commit()
    return jsonify({"is_active": target.is_active}), 200


@admin_bp.route("/staff", methods=["POST"])
@require_admin
def create_staff(user):
    """Create an officer or supervisor account."""
    data = request.get_json()
    role_name = data.get("role", "").lower()
    if role_name not in ("officer", "supervisor"):
        return jsonify({"error": "Role must be officer or supervisor"}), 400

    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already in use"}), 409

    from models.role import Role
    from models.user_role import User_role

    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify({"error": f"Role '{role_name}' not found"}), 400

    new_user = User(
        email=email,
        password_hash=generate_password_hash(data.get("password", "changeme123")),
        is_active=True,
    )
    db.session.add(new_user)
    db.session.flush()

    db.session.add(User_role(user_id=new_user.id, role_id=role.id))

    if role_name == "officer":
        db.session.add(OfficerProfile(
            user_id_fk=new_user.id,
            firstname=data.get("firstname", ""),
            lastname=data.get("lastname", ""),
            staff_id=data.get("staff_id", ""),
            department=data.get("department"),
            branch_code=data.get("branch_code"),
            work_email=email,
            work_phone=data.get("work_phone"),
        ))
    else:
        db.session.add(SupervisorProfile(
            user_id_fk=new_user.id,
            firstname=data.get("firstname", ""),
            lastname=data.get("lastname", ""),
            staff_id=data.get("staff_id", ""),
            department=data.get("department"),
            branch_code=data.get("branch_code"),
            work_email=email,
            work_phone=data.get("work_phone"),
        ))

    db.session.commit()
    return jsonify({"id": new_user.id, "email": new_user.email, "role": role_name}), 201


@admin_bp.route("/stats", methods=["GET"])
@require_admin
def get_stats(user):
    statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_ITA",
                "ACTION_REQUIRED", "WAITING_ON_APPLICANT", "RESUBMITTED",
                "ESCALATED", "APPROVED", "REJECTED"]
    return jsonify({
        "applications_by_status": {
            s: Application.query.filter_by(status=s).count() for s in statuses
        },
        "total_users":       User.query.count(),
        "total_applicants":  LicenceRecord.query.filter(LicenceRecord.user_id_fk.isnot(None)).count(),
        "total_officers":    OfficerProfile.query.filter_by(is_active_staff=True).count(),
        "total_supervisors": SupervisorProfile.query.filter_by(is_active_staff=True).count(),
    }), 200