from flask import Blueprint, jsonify, request
from config.extensions import db
from models.application import Application
from models.application_event import ApplicationEvent
from models.document import Document
from models.licence_record import LicenceRecord
from models.applicant_profile import Profile
from utils.auth import require_officer
from datetime import datetime, timezone

officer_bp = Blueprint("officer", __name__, url_prefix="/api/officer")


def _app_summary(a):
    profile = a.applicant.profile if a.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=a.user_id_fk).first()
    return {
        "id":                 a.id,
        "application_number": a.application_number,
        "transaction_type":   a.transaction_type,
        "status":             a.status,
        "submitted_at":       a.submitted_at.isoformat() if a.submitted_at else None,
        "created_at":         a.created_at.isoformat()   if a.created_at   else None,
        "applicant_name":     f"{profile.firstname} {profile.lastname}" if profile else "—",
        "applicant_email":    a.applicant.email if a.applicant else "—",
        "trn":                licence.trn if licence else "—",
        "fee_amount":         str(a.fee_amount) if a.fee_amount else None,
        "officer_comment":    a.officer_comment,
    }


@officer_bp.route("/queue", methods=["GET"])
@require_officer
def get_queue(user):
    """Return all applications assigned to this officer."""
    status_filter = request.args.get("status")
    query = Application.query.filter_by(assigned_officer_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter.upper())
    apps = query.order_by(Application.submitted_at.asc()).all()
    return jsonify({"applications": [_app_summary(a) for a in apps]}), 200


@officer_bp.route("/queue/counts", methods=["GET"])
@require_officer
def get_queue_counts(user):
    """Return counts per status for the officer's queue."""
    statuses = ["SUBMITTED", "UNDER_REVIEW", "WAITING_ON_APPLICANT", "RESUBMITTED", "ESCALATED", "APPROVED", "REJECTED"]
    counts = {}
    for s in statuses:
        counts[s] = Application.query.filter_by(
            assigned_officer_id=user.id, status=s
        ).count()
    return jsonify(counts), 200


@officer_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_officer
def get_application(user, app_id):
    """Full application detail for officer review."""
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    profile = app.applicant.profile if app.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()

    documents = [{
        "id":                d.id,
        "doc_type":          d.doc_type,
        "doc_subtype":       d.doc_subtype,
        "file_path":         d.file_path,
        "original_filename": d.original_filename,
        "review_status":     d.review_status,
        "review_comment":    d.review_comment,
        "uploaded_at":       d.uploaded_at.isoformat() if d.uploaded_at else None,
        "version":           d.version,
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
            "id":                     app.id,
            "application_number":     app.application_number,
            "transaction_type":       app.transaction_type,
            "replacement_reason":     app.replacement_reason,
            "status":                 app.status,
            "submitted_at":           app.submitted_at.isoformat() if app.submitted_at else None,
            "fee_amount":             str(app.fee_amount) if app.fee_amount else None,
            "payment_reference":      app.payment_reference,
            "payment_confirmed_at":   app.payment_confirmed_at.isoformat() if app.payment_confirmed_at else None,
            "declaration":            app.declaration,
            "officer_comment":        app.officer_comment,
            "address_change_requested": app.address_change_requested,
            "new_address_line1":      app.new_address_line1,
            "new_address_line2":      app.new_address_line2,
            "new_parish":             app.new_parish,
            "trustee_collection":     app.trustee_collection,
            "trustee_name":           app.trustee_name,
            "trustee_contact":        app.trustee_contact,
            "documents":              documents,
            "events":                 events,
        },
        "applicant": {
            "firstname":    profile.firstname    if profile else None,
            "lastname":     profile.lastname     if profile else None,
            "date_of_birth":str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "phone":        profile.phone        if profile else None,
            "email":        app.applicant.email  if app.applicant else None,
            "address_line1":profile.address_line1 if profile else None,
            "address_line2":profile.address_line2 if profile else None,
            "parish":       profile.parish       if profile else None,
            "sex":          profile.sex          if profile else None,
        },
        "licence": {
            "trn":           licence.trn           if licence else None,
            "licence_class": licence.licence_class if licence else None,
            "status":        licence.status        if licence else None,
            "issue_date":    str(licence.issue_date)   if licence and licence.issue_date   else None,
            "expiry_date":   str(licence.expiry_date)  if licence and licence.expiry_date  else None,
            "collectorate":  licence.collectorate  if licence else None,
        },
    }), 200


@officer_bp.route("/applications/<int:app_id>/start-review", methods=["POST"])
@require_officer
def start_review(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status not in ("SUBMITTED", "RESUBMITTED"):
        return jsonify({"error": "Application is not in a reviewable state"}), 400

    prev = app.status
    app.status = "UNDER_REVIEW"
    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status=prev,
        to_status="UNDER_REVIEW",
        comment="Officer started review",
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@require_officer
def approve(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
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
        from_status="UNDER_REVIEW",
        to_status="APPROVED",
        comment=app.officer_comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/request-resubmission", methods=["POST"])
@require_officer
def request_resubmission(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    comment = data.get("comment", "").strip()
    if not comment:
        return jsonify({"error": "A comment is required when requesting resubmission"}), 400

    app.status = "WAITING_ON_APPLICANT"
    app.officer_comment = comment
    app.officer_decision_at = datetime.now(timezone.utc)

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status="UNDER_REVIEW",
        to_status="WAITING_ON_APPLICANT",
        comment=comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@require_officer
def reject(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
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
        from_status="UNDER_REVIEW",
        to_status="REJECTED",
        comment=comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/escalate", methods=["POST"])
@require_officer
def escalate(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    comment = data.get("comment", "").strip()
    if not comment:
        return jsonify({"error": "A comment is required when escalating"}), 400

    app.status = "ESCALATED"
    app.escalated_to_supervisor_at = datetime.now(timezone.utc)
    app.escalation_reason = comment

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="ESCALATION",
        from_status="UNDER_REVIEW",
        to_status="ESCALATED",
        comment=comment,
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/review", methods=["POST"])
@require_officer
def review_document(user, app_id, doc_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    doc = Document.query.filter_by(id=doc_id, application_fk=app_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json() or {}
    status = data.get("status", "").upper()
    if status not in ("APPROVED", "RESUBMIT_REQUIRED", "REJECTED"):
        return jsonify({"error": "Invalid review status"}), 400

    doc.review_status = status
    doc.review_comment = data.get("comment", "")
    doc.reviewed_by_user_id = user.id
    doc.reviewed_at = datetime.now(timezone.utc)

    db.session.add(ApplicationEvent(
        application_fk=app_id,
        triggered_by_user_id=user.id,
        event_type="DOCUMENT_REVIEW",
        comment=f"{doc.doc_type}: {status} — {doc.review_comment}",
    ))
    db.session.commit()
    return jsonify({"review_status": doc.review_status}), 200