from flask import Blueprint, jsonify, request
from config.extensions import db
from models.application import Application
from models.application_event import ApplicationEvent
from models.licence_record import LicenceRecord
from models.applicant_profile import Profile
from utils.auth import require_supervisor
from datetime import datetime, timezone

supervisor_bp = Blueprint("supervisor", __name__, url_prefix="/api/supervisor")


def _app_summary(a):
    profile = a.applicant.profile if a.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=a.user_id_fk).first()
    officer = a.assigned_officer
    officer_profile = officer.officerprofile if officer else None
    return {
        "id":                 a.id,
        "application_number": a.application_number,
        "transaction_type":   a.transaction_type,
        "status":             a.status,
        "submitted_at":       a.submitted_at.isoformat() if a.submitted_at else None,
        "escalated_at":       a.escalated_to_supervisor_at.isoformat() if a.escalated_to_supervisor_at else None,
        "escalation_reason":  a.escalation_reason,
        "applicant_name":     f"{profile.firstname} {profile.lastname}" if profile else "—",
        "trn":                licence.trn if licence else "—",
        "officer_name":       f"{officer_profile.firstname} {officer_profile.lastname}" if officer_profile else "—",
        "officer_comment":    a.officer_comment,
    }


@supervisor_bp.route("/queue", methods=["GET"])
@require_supervisor
def get_queue(user):
    """All escalated applications."""
    status_filter = request.args.get("status", "ESCALATED").upper()
    apps = (
        Application.query
        .filter_by(status=status_filter)
        .order_by(Application.escalated_to_supervisor_at.asc())
        .all()
    )
    return jsonify({"applications": [_app_summary(a) for a in apps]}), 200


@supervisor_bp.route("/queue/counts", methods=["GET"])
@require_supervisor
def get_queue_counts(user):
    statuses = ["ESCALATED", "APPROVED", "REJECTED"]
    counts = {s: Application.query.filter_by(status=s).count() for s in statuses}
    return jsonify(counts), 200


@supervisor_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_supervisor
def get_application(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    profile = app.applicant.profile if app.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    officer = app.assigned_officer
    officer_profile = officer.officerprofile if officer else None

    documents = [{
        "id":                d.id,
        "doc_type":          d.doc_type,
        "doc_subtype":       d.doc_subtype,
        "file_path":         d.file_path,
        "original_filename": d.original_filename,
        "review_status":     d.review_status,
        "review_comment":    d.review_comment,
        "uploaded_at":       d.uploaded_at.isoformat() if d.uploaded_at else None,
    } for d in app.documents if d.is_current]

    events = [{
        "event_type":  e.event_type,
        "from_status": e.from_status,
        "to_status":   e.to_status,
        "comment":     e.comment,
        "created_at":  e.created_at.isoformat() if e.created_at else None,
    } for e in app.events]

    return jsonify({
        "application": {
            "id":                   app.id,
            "application_number":   app.application_number,
            "transaction_type":     app.transaction_type,
            "status":               app.status,
            "submitted_at":         app.submitted_at.isoformat() if app.submitted_at else None,
            "escalated_at":         app.escalated_to_supervisor_at.isoformat() if app.escalated_to_supervisor_at else None,
            "escalation_reason":    app.escalation_reason,
            "officer_comment":      app.officer_comment,
            "declaration":          app.declaration,
            "documents":            documents,
            "events":               events,
        },
        "applicant": {
            "firstname":     profile.firstname     if profile else None,
            "lastname":      profile.lastname      if profile else None,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "phone":         profile.phone         if profile else None,
            "email":         app.applicant.email   if app.applicant else None,
            "address_line1": profile.address_line1 if profile else None,
            "parish":        profile.parish        if profile else None,
        },
        "licence": {
            "trn":           licence.trn           if licence else None,
            "licence_class": licence.licence_class if licence else None,
            "status":        licence.status        if licence else None,
            "expiry_date":   str(licence.expiry_date) if licence and licence.expiry_date else None,
        },
        "officer": {
            "name":     f"{officer_profile.firstname} {officer_profile.lastname}" if officer_profile else None,
            "staff_id": officer_profile.staff_id if officer_profile else None,
            "email":    officer.email if officer else None,
        },
    }), 200


@supervisor_bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@require_supervisor
def approve(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    app.status = "APPROVED"
    app.officer_decision_at = datetime.now(timezone.utc)
    app.officer_comment = data.get("comment", "")

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status="ESCALATED",
        to_status="APPROVED",
        comment=app.officer_comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@require_supervisor
def reject(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    comment = data.get("comment", "").strip()
    if not comment:
        return jsonify({"error": "A comment is required when rejecting"}), 400

    app.status = "REJECTED"
    app.officer_comment = comment
    app.officer_decision_at = datetime.now(timezone.utc)

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status="ESCALATED",
        to_status="REJECTED",
        comment=comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/applications/<int:app_id>/return-to-officer", methods=["POST"])
@require_supervisor
def return_to_officer(user, app_id):
    """Send the application back to the assigned officer."""
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    comment = data.get("comment", "").strip()
    if not comment:
        return jsonify({"error": "A comment is required when returning to officer"}), 400

    app.status = "UNDER_REVIEW"
    app.officer_comment = comment

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status="ESCALATED",
        to_status="UNDER_REVIEW",
        comment=f"Returned by supervisor: {comment}",
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/officers", methods=["GET"])
@require_supervisor
def get_officers(user):
    """List all active officers — for assignment purposes."""
    from models.officer_profile import OfficerProfile
    officers = OfficerProfile.query.filter_by(is_active_staff=True).all()
    return jsonify({
        "officers": [{
            "user_id":    o.user_id_fk,
            "name":       f"{o.firstname} {o.lastname}",
            "staff_id":   o.staff_id,
            "department": o.department,
            "branch":     o.branch.full if o.branch else None,
        } for o in officers]
    }), 200


@supervisor_bp.route("/applications/<int:app_id>/assign", methods=["POST"])
@require_supervisor
def assign_officer(user, app_id):
    """Assign or reassign an application to an officer."""
    from models.user import User as UserModel
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    officer_user_id = data.get("officer_user_id")
    if not officer_user_id:
        return jsonify({"error": "officer_user_id is required"}), 400

    officer = UserModel.query.get(officer_user_id)
    if not officer or not officer.has_role("officer"):
        return jsonify({"error": "Invalid officer"}), 400

    app.assigned_officer_id = officer_user_id
    app.status = "SUBMITTED"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="ASSIGNMENT",
        assigned_to_user_id=officer_user_id,
        comment=f"Assigned to officer by supervisor",
    ))
    db.session.commit()
    return jsonify({"status": app.status, "assigned_to": officer_user_id}), 200