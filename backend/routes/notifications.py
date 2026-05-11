# Notification routes — fetch and mark-read endpoints for officers, applicants, and supervisors.
from flask import Blueprint, jsonify, request
from config.extensions import db
from models.notification import Notification
from utils.auth import require_officer, require_applicant, require_supervisor

notif_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

# Officer notifications
@notif_bp.route("/", methods=["GET"])
@require_officer
def get_notifications(user):
    notifs = Notification.query.filter_by(
        recipient_user_id=user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()

    def _serialise(n):
        app = n.application
        profile = app.applicant.profile if app and app.applicant else None
        return {
            "id":                 n.id,
            "application_id":     n.application_fk,
            "application_number": app.application_number if app else None,
            "applicant_name":     f"{profile.firstname} {profile.lastname}" if profile else None,
            "event_type":         n.event_type,
            "message":            n.message,
            "is_read":            n.is_read,
            "created_at":         n.created_at.isoformat(),
        }
    return jsonify({"notifications": [_serialise(n) for n in notifs]}), 200


@notif_bp.route("/read-all", methods=["POST"])
@require_officer
def mark_all_read(user):
    Notification.query.filter_by(
        recipient_user_id=user.id, is_read=False
    ).update({"is_read": True})
    db.session.commit()
    return jsonify({"success": True}), 200


@notif_bp.route("/<int:notif_id>/read", methods=["POST"])
@require_officer
def mark_one_read(user, notif_id):
    n = Notification.query.filter_by(id=notif_id, recipient_user_id=user.id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"success": True}), 200


# Applicant notifications
@notif_bp.route("/applicant", methods=["GET"])
@require_applicant
def get_applicant_notifications(user):
    notifs = Notification.query.filter_by(
        recipient_user_id=user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()

    return jsonify({"notifications": [{
        "id":                 n.id,
        "application_id":     n.application_fk,
        "application_number": n.application.application_number if n.application else None,
        "event_type":         n.event_type,
        "message":            n.message,
        "is_read":            n.is_read,
        "created_at":         n.created_at.isoformat(),
    } for n in notifs]}), 200


@notif_bp.route("/applicant/read-all", methods=["POST"])
@require_applicant
def mark_all_read_applicant(user):
    Notification.query.filter_by(
        recipient_user_id=user.id, is_read=False
    ).update({"is_read": True})
    db.session.commit()
    return jsonify({"success": True}), 200


@notif_bp.route("/applicant/<int:notif_id>/read", methods=["POST"])
@require_applicant
def mark_one_read_applicant(user, notif_id):
    n = Notification.query.filter_by(id=notif_id, recipient_user_id=user.id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"success": True}), 200


# Supervisor notifications
@notif_bp.route("/supervisor", methods=["GET"])
@require_supervisor
def get_supervisor_notifications(user):
    notifs = Notification.query.filter_by(
        recipient_user_id=user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()

    return jsonify({"notifications": [{
        "id":                 n.id,
        "application_id":     n.application_fk,
        "application_number": n.application.application_number if n.application else None,
        "event_type":         n.event_type,
        "message":            n.message,
        "is_read":            n.is_read,
        "created_at":         n.created_at.isoformat(),
    } for n in notifs]}), 200


@notif_bp.route("/supervisor/read-all", methods=["POST"])
@require_supervisor
def mark_all_read_supervisor(user):
    Notification.query.filter_by(
        recipient_user_id=user.id, is_read=False
    ).update({"is_read": True})
    db.session.commit()
    return jsonify({"success": True}), 200


@notif_bp.route("/supervisor/<int:notif_id>/read", methods=["POST"])
@require_supervisor
def mark_one_read_supervisor(user, notif_id):
    n = Notification.query.filter_by(id=notif_id, recipient_user_id=user.id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"success": True}), 200