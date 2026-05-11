# Officer routes — queue, single application detail, document proxy, decisions (approve/reject/resubmit/escalate), signature management, and background-removal for licence photos.
import os
import random
import string
from flask import Blueprint, jsonify, request, send_file
from config.extensions import db
from models.application import Application
from models.application_event import ApplicationEvent
from models.document import Document
from models.licence_record import LicenceRecord
from models.digital_licence import DigitalLicence
from models.applicant_profile import Profile
from models.notification import Notification
from models.user import User
from utils.auth import require_officer
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta
from utils.assignment import drain_queue


def _remove_bg_for_app(app):
    """strips the background from the licence photo and returns a base64 data URL.
    falls back to the original if rembg isn't installed."""
    import io, os, base64
    from flask import current_app
    doc = next((d for d in app.documents if d.doc_type == "licence_photo" and d.is_current), None)
    if not doc or not doc.file_path:
        return None
    upload_root = current_app.config.get("UPLOAD_FOLDER", "uploads")
    full_path = os.path.join(upload_root, doc.file_path.lstrip("/").replace("uploads/", "", 1))
    if not os.path.exists(full_path):
        return None
    with open(full_path, "rb") as f:
        img_bytes = f.read()
    try:
        from rembg import remove
        result = remove(img_bytes)
        return "data:image/png;base64," + base64.b64encode(result).decode()
    except Exception:
        # rembg not available, just use the original
        ext = os.path.splitext(full_path)[1].lower().lstrip(".")
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
        return f"data:{mime};base64," + base64.b64encode(img_bytes).decode()


def _notify(recipient_user_id, application, event_type, message):
    try:
        db.session.add(Notification(
            recipient_user_id=recipient_user_id,
            application_fk=application.id,
            event_type=event_type,
            message=message,
        ))
    except Exception:
        pass  # never let a notification failure break the main action


def generate_control_number(collectorate: str) -> str:
    prefix = (collectorate or "").strip()[:3].lstrip("0").zfill(3) if collectorate else "000"
    # force exactly 3 digits
    prefix = "".join(c for c in (collectorate or "") if c.isdigit())[:3].zfill(3)
    suffix = "".join(random.choices(string.digits, k=7))
    return prefix + suffix

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
    status_filter = request.args.get("status")
    query = Application.query.filter_by(assigned_officer_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter.upper())
    apps = query.order_by(Application.submitted_at.asc()).all()
    return jsonify({"applications": [_app_summary(a) for a in apps]}), 200


@officer_bp.route("/queue/counts", methods=["GET"])
@require_officer
def get_queue_counts(user):
    statuses = ["SUBMITTED", "UNDER_REVIEW", "WAITING_ON_APPLICANT", "RESUBMITTED", "ESCALATED", "APPROVED", "REJECTED"]
    counts = {}
    for s in statuses:
        counts[s] = Application.query.filter_by(
            assigned_officer_id=user.id, status=s
        ).count()
    return jsonify(counts), 200


@officer_bp.route("/profile/signature", methods=["GET"])
@require_officer
def get_signature(user):
    from models.officer_profile import OfficerProfile
    profile = OfficerProfile.query.filter_by(user_id_fk=user.id).first()
    return jsonify({"signature_image": profile.signature_image if profile else None}), 200


@officer_bp.route("/profile/signature", methods=["POST"])
@require_officer
def save_signature(user):
    from models.officer_profile import OfficerProfile
    data = request.get_json() or {}
    sig = data.get("signature_image", "").strip()
    if not sig:
        return jsonify({"error": "No signature provided"}), 400
    profile = OfficerProfile.query.filter_by(user_id_fk=user.id).first()
    if not profile:
        return jsonify({"error": "Officer profile not found"}), 404
    profile.signature_image = sig
    db.session.commit()
    return jsonify({"status": "saved"}), 200


def _get_officer_decision(app):
    from models.officer_profile import OfficerProfile
    for e in sorted(app.events, key=lambda x: x.created_at or datetime.min):
        if e.event_type in ("APPROVED", "REJECTED") and e.triggered_by:
            op = getattr(e.triggered_by, "officerprofile", None)
            if op:
                return {
                    "decision":          e.to_status or e.event_type,
                    "officer_name":      f"{op.firstname} {op.lastname}",
                    "officer_staff_id":  op.staff_id,
                    "timestamp":         e.created_at.isoformat() if e.created_at else None,
                    "notes":             e.comment,
                    "officer_signature": op.signature_image,
                }
    return None


@officer_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_officer
def get_application(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    profile = app.applicant.profile if app.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()

    # previous review comments per doc type — shown when the applicant resubmits
    prev_review = {}
    for d in app.documents:
        if not d.is_current and d.review_comment:
            prev_review[d.doc_type] = d.review_comment

    def _serialise_doc(d, include_prev=False):
        obj = {
            "id":                  d.id,
            "doc_type":            d.doc_type,
            "doc_subtype":         d.doc_subtype,
            "file_path":           d.file_path,
            "original_filename":   d.original_filename,
            "review_status":       d.review_status,
            "review_comment":      d.review_comment,
            "reviewed_at":         d.reviewed_at.isoformat() if d.reviewed_at else None,
            "uploaded_at":         d.uploaded_at.isoformat() if d.uploaded_at else None,
            "version":             d.version,
            "is_current":          d.is_current,
            "ai_check_passed":     d.ai_check_passed,
            "ai_check_score":      d.ai_check_score,
            "ocr_ran":             getattr(d, "ocr_ran", False),
            "ocr_name":            getattr(d, "ocr_name", None),
            "ocr_dob":             getattr(d, "ocr_dob", None),
            "ocr_id_number":       getattr(d, "ocr_id_number", None),
            "ocr_confidence":      getattr(d, "ocr_confidence", None),
            "ocr_fields":          getattr(d, "ocr_fields", None),
        }
        if include_prev:
            obj["prev_review_comment"] = prev_review.get(d.doc_type)
        return obj

    documents          = [_serialise_doc(d, include_prev=True)  for d in app.documents if d.is_current]
    previous_documents = [_serialise_doc(d, include_prev=False) for d in app.documents if not d.is_current]

    def _serialise_event(e):
        actor = e.triggered_by
        actor_name = "System"
        actor_role = "system"
        if actor:
            op = getattr(actor, "officerprofile", None)
            sp = getattr(actor, "supervisorprofile", None)
            pp = getattr(actor, "profile", None)
            if sp:
                actor_name = f"{sp.firstname} {sp.lastname}"
                actor_role = "supervisor"
            elif op:
                actor_name = f"{op.firstname} {op.lastname}"
                actor_role = "officer"
            elif pp:
                actor_name = f"{pp.firstname} {pp.lastname}"
                actor_role = "applicant"
            else:
                actor_name = actor.email
                actor_role = "user"
        return {
            "event_type":  e.event_type,
            "from_status": e.from_status,
            "to_status":   e.to_status,
            "comment":     e.comment,
            "actor":       actor_name,
            "actor_role":  actor_role,
            "created_at":  e.created_at.isoformat() if e.created_at else None,
        }

    events = [_serialise_event(e) for e in app.events]

    # grab the supervisor decision if there is one
    supervisor_decision = None
    for e in app.events:
        if e.event_type == "SUPERVISOR_DECISION":
            actor = e.triggered_by
            sp = getattr(actor, "supervisorprofile", None) if actor else None
            supervisor_decision = {
                "decision":             e.to_status,
                "supervisor_name":      f"{sp.firstname} {sp.lastname}" if sp else (actor.email if actor else "—"),
                "supervisor_staff_id":  sp.staff_id if sp else None,
                "timestamp":            e.created_at.isoformat() if e.created_at else None,
                "notes":                e.comment,
                "supervisor_signature": getattr(sp, "signature_image", None) if sp else None,
            }

    return jsonify({
        "application": {
            "id":                       app.id,
            "application_number":       app.application_number,
            "transaction_type":         app.transaction_type,
            "replacement_reason":       app.replacement_reason,
            "status":                   app.status,
            "submitted_at":             app.submitted_at.isoformat() if app.submitted_at else None,
            "fee_amount":               str(app.fee_amount) if app.fee_amount else None,
            "payment_reference":        app.payment_reference,
            "payment_confirmed_at":     app.payment_confirmed_at.isoformat() if app.payment_confirmed_at else None,
            "declaration":              app.declaration,
            "signature_image":          app.signature_image,
            "declaration_signed_at":    app.declaration_signed_at.isoformat() if app.declaration_signed_at else None,
            "officer_comment":          app.officer_comment,
            "address_change_requested": app.address_change_requested,
            "new_address_line1":        app.new_address_line1,
            "new_address_line2":        app.new_address_line2,
            "new_parish":               app.new_parish,
            "new_occupation":           app.new_occupation,
            "trustee_collection":       app.trustee_collection,
            "trustee_name":             app.trustee_name,
            "trustee_contact":          app.trustee_contact,
            # face verification fields
            "verification_passed":        app.verification_passed,
            "liveness_score":             app.liveness_score,
            "face_match_score":           app.face_match_score,
            "verification_attempts":      app.verification_attempts,
            "verified_at":                app.verified_at.isoformat() if app.verified_at else None,
            "verification_photo":         app.verification_photo,
            "needs_manual_review":        app.needs_manual_review,
            "manual_review_reason":       app.manual_review_reason,
            "reverification_requested":   app.reverification_requested,
            "officer_decision_at":        app.officer_decision_at.isoformat() if app.officer_decision_at else None,
            "pickup_collectorate":        app.pickup_collectorate.full if app.pickup_collectorate else None,
            "ita_reference":             app.ita_reference,
            "ita_outcome":               app.ita_outcome,
            "ita_request_sent_at":       app.ita_request_sent_at.isoformat() if app.ita_request_sent_at else None,
            "ita_response_received_at":  app.ita_response_received_at.isoformat() if app.ita_response_received_at else None,
            "documents":                documents,
            "previous_documents":       previous_documents,
            "events":                   events,
            "officer_decision":         _get_officer_decision(app),
            "supervisor_decision":      supervisor_decision,
        },
        "applicant": {
            "firstname":     profile.firstname           if profile else None,
            "lastname":      profile.lastname            if profile else None,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "phone":         profile.phone               if profile else None,
            "email":         app.applicant.email         if app.applicant else None,
            "address_line1": profile.address_line1       if profile else None,
            "address_line2": profile.address_line2       if profile else None,
            "parish":        profile.parish              if profile else None,
            "sex":           profile.sex                 if profile else None,
            "occupation":    licence.occupation          if licence else None,
        },
        "licence": {
            "trn":                   licence.trn                if licence else None,
            "control_number":        licence.control_number     if licence else None,
            "licence_class":         licence.licence_class      if licence else None,
            "status":                licence.status             if licence else None,
            "first_issue_date":      str(licence.first_issue_date) if licence and licence.first_issue_date else None,
            "issue_date":            str(licence.issue_date)    if licence and licence.issue_date  else None,
            "expiry_date":           str(licence.expiry_date)   if licence and licence.expiry_date else None,
            "collectorate":          licence.collectorate       if licence else None,
            "nationality":           licence.nationality        if licence else None,
            "place_of_birth":        licence.place_of_birth     if licence else None,
            "judicial_endorsements": licence.judicial_endorsements if licence else None,
            "occupation":            licence.occupation         if licence else None,
        },
        "officer": {
            "name":      f"{user.officerprofile.firstname} {user.officerprofile.lastname}" if user.officerprofile else None,
            "staff_id":  user.officerprofile.staff_id    if user.officerprofile else None,
            "email":     user.email,
            "signature": user.officerprofile.signature_image if user.officerprofile else None,
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

    # push any approved changes through to the licence record
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    if licence:
        if app.address_change_requested and app.new_address_line1:
            licence.address_line1 = app.new_address_line1
            licence.address_line2 = app.new_address_line2
            licence.parish        = app.new_parish
            app.address_change_approved    = True
            app.address_change_approved_at = datetime.now(timezone.utc)
        if app.new_occupation:
            licence.occupation = app.new_occupation
        # new control number for this issue
        licence.control_number = generate_control_number(licence.collectorate)
        licence.issue_date  = date.today()
        licence.expiry_date = date.today() + relativedelta(years=5)
        licence.status      = "ACTIVE"

    if not app.digital_licence:
        photo_url = _remove_bg_for_app(app)
        db.session.add(DigitalLicence(
            application_fk=app.id,
            user_id_fk=app.user_id_fk,
            photo_url=photo_url,
        ))
        app.digital_licence_generated_at = datetime.now(timezone.utc)
        _notify(
            app.user_id_fk, app, "DIGITAL_LICENCE_GENERATED",
            f"Your digital licence has been generated for application {app.application_number}. You can view it on your dashboard.",
        )

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status="UNDER_REVIEW",
        to_status="APPROVED",
        comment=app.officer_comment,
    ))

    _notify(
        app.user_id_fk, app, "APPLICATION_APPROVED",
        f"Your application {app.application_number} has been approved.",
    )

    # officer slot freed up — pull in the next waiting application
    drain_queue(user.id)

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

    _notify(
        app.user_id_fk, app, "RESUBMISSION_REQUESTED",
        f"Action required on application {app.application_number}: {comment}",
    )

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

    _notify(
        app.user_id_fk, app, "APPLICATION_REJECTED",
        f"Your application {app.application_number} has been rejected. Reason: {comment}",
    )

    # officer slot freed up — pull in the next waiting application
    drain_queue(user.id)

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

    # tell the applicant
    _notify(
        app.user_id_fk, app, "APPLICATION_ESCALATED",
        f"Your application {app.application_number} has been escalated for supervisor review.",
    )

    # notify supervisors at the same branch, or all supervisors if no branch
    from models.supervisor_profile import SupervisorProfile
    officer_profile = user.officerprofile
    branch = officer_profile.branch_code if officer_profile else None
    sup_query = SupervisorProfile.query.filter_by(is_active_staff=True)
    if branch:
        sup_query = sup_query.filter_by(branch_code=branch)
    supervisors = sup_query.all()
    for sp in supervisors:
        _notify(
            sp.user_id_fk, app, "ESCALATION_RECEIVED",
            f"Application {app.application_number} has been escalated to you. Reason: {comment}",
        )

    # escalated cases leave the officer's active count so pull in the next one
    drain_queue(user.id)

    db.session.commit()
    return jsonify({"status": app.status}), 200


@officer_bp.route("/applications/<int:app_id>/request-reverification", methods=["POST"])
@require_officer
def request_reverification(user, app_id):
    app = Application.query.filter_by(id=app_id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    app.reverification_requested = True
    app.needs_manual_review = True

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="REVERIFICATION_REQUESTED",
        comment="Officer requested the applicant to redo identity verification.",
    ))
    db.session.commit()
    return jsonify({"status": "ok"}), 200


@officer_bp.route("/applications/<int:app_id>/cancel-reverification", methods=["POST"])
@require_officer
def cancel_reverification(user, app_id):
    app = Application.query.filter_by(id=app_id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    app.reverification_requested = False
    app.needs_manual_review = False

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="REVERIFICATION_CANCELLED",
        comment="Officer cancelled the re-verification request.",
    ))
    db.session.commit()
    return jsonify({"status": "ok"}), 200


@officer_bp.route("/applications/<int:app_id>/clear-manual-review", methods=["POST"])
@require_officer
def clear_manual_review(user, app_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    app.needs_manual_review  = False
    app.manual_review_reason = None

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="MANUAL_REVIEW_CLEARED",
        comment="Officer cleared the manual identity review flag.",
    ))
    db.session.commit()
    return jsonify({"status": "ok"}), 200


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


@officer_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/review", methods=["DELETE"])
@require_officer
def remove_document_review(user, app_id, doc_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    doc = Document.query.filter_by(id=doc_id, application_fk=app_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json() or {}
    prev_status = doc.review_status or "NONE"

    doc.review_status        = None
    doc.review_comment       = None
    doc.reviewed_by_user_id  = None
    doc.reviewed_at          = None

    db.session.add(ApplicationEvent(
        application_fk=app_id,
        triggered_by_user_id=user.id,
        event_type="DOCUMENT_REVIEW",
        comment=f"{doc.doc_type}: decision removed (was {prev_status}) — {data.get('reason', '').strip()}",
    ))
    db.session.commit()
    return jsonify({"review_status": None}), 200


@officer_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/file", methods=["GET"])
@require_officer
def get_document_file(user, app_id, doc_id):
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    doc = Document.query.filter_by(id=doc_id, application_fk=app_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if not os.path.exists(doc.file_path):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(doc.file_path)


@officer_bp.route("/applications/<int:app_id>/ita-request", methods=["POST"])
@require_officer
def ita_request(user, app_id):
    """Send the ITA clearance email and set status to PENDING_ITA. Returns immediately."""
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.transaction_type != "REPLACEMENT":
        return jsonify({"error": "ITA check only applies to replacement applications"}), 400
    if app.ita_reference:
        return jsonify({"error": "ITA request already sent"}), 400

    from models.officer_profile import OfficerProfile
    officer_profile = OfficerProfile.query.filter_by(user_id_fk=user.id).first()
    officer_name    = f"{officer_profile.firstname} {officer_profile.lastname}" if officer_profile else "Officer"
    officer_email   = officer_profile.work_email if officer_profile else "officer@taj.gov.jm"
    staff_id        = officer_profile.staff_id   if officer_profile else "—"

    profile = app.applicant.profile if app.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    applicant_name = f"{profile.firstname} {profile.lastname}" if profile else "—"
    trn            = licence.trn            if licence else "—"
    licence_number = licence.control_number if licence else "—"
    collectorate   = app.pickup_collectorate.full if app.pickup_collectorate else "—"
    submitted_date = app.submitted_at.strftime("%d %B %Y") if app.submitted_at else "—"
    outgoing_text = (
        f"To: ita@ita.gov.jm\n"
        f"From: {officer_email}\n"
        f"Subject: Traffic Clearance Request — {app.application_number}\n\n"
        f"Dear Island Traffic Authority,\n\n"
        f"I am writing to request a traffic clearance certificate for the following applicant "
        f"in connection with a driver's licence replacement application "
        f"submitted through the DLRSJAM system.\n\n"
        f"Application Reference: {app.application_number}\n"
        f"Applicant Name:        {applicant_name}\n"
        f"TRN:                   {trn}\n"
        f"Licence Number:        {licence_number}\n"
        f"Date of Application:   {submitted_date}\n"
        f"Collectorate:          {collectorate}\n\n"
        f"Please confirm whether this applicant has any outstanding traffic violations, "
        f"fines, or suspensions that would preclude the issuance of a replacement driver's licence.\n\n"
        f"This request is made under the authority of the Road Traffic Act 2018.\n\n"
        f"Regards,\n"
        f"{officer_name} | Staff ID: {staff_id}\n"
        f"TAJ Driver's Licence Unit\n"
        f"Tax Administration Jamaica"
    )

    from models.document import Document
    out_doc = Document(
        application_fk=app.id,
        doc_type="ITA_REQUEST_EMAIL",
        original_filename="ita_request.txt",
        file_path="",
        is_current=True,
        review_status="APPROVED",
        review_comment=outgoing_text,
    )
    db.session.add(out_doc)

    app.status = "PENDING_ITA"
    app.ita_request_sent_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"sent": True, "outgoing_email": outgoing_text}), 200


@officer_bp.route("/applications/<int:app_id>/ita-resolve", methods=["POST"])
@require_officer
def ita_resolve(user, app_id):
    """Receive the ITA response, update status to UNDER_REVIEW, notify officer."""
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status != "PENDING_ITA":
        return jsonify({"error": "Application is not awaiting ITA response"}), 400
    if app.ita_reference:
        return jsonify({"error": "ITA response already received"}), 400

    digits  = "".join(random.choices(string.digits, k=4))
    ita_ref = f"ITA-CLR-2026-{digits}"

    response_text = (
        f"From: clearance@ita.gov.jm\n"
        f"Subject: RE: Traffic Clearance Request — {app.application_number}\n\n"
        f"Dear Officer,\n\n"
        f"We have reviewed our records for the above-referenced applicant.\n\n"
        f"CLEARANCE STATUS: CLEARED\n\n"
        f"No outstanding traffic violations, fines, or suspensions were found. "
        f"This applicant is cleared for licence replacement.\n\n"
        f"ITA Reference: {ita_ref}\n\n"
        f"Island Traffic Authority"
    )

    from models.document import Document
    resp_doc = Document(
        application_fk=app.id,
        doc_type="ITA_RESPONSE_EMAIL",
        original_filename="ita_response.txt",
        file_path="",
        is_current=True,
        review_status="APPROVED",
        review_comment=response_text,
    )
    db.session.add(resp_doc)

    app.ita_outcome              = "CLEARED"
    app.ita_reference            = ita_ref
    app.ita_response_received_at = datetime.now(timezone.utc)
    app.status                   = "UNDER_REVIEW"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="ITA_CLEARED",
        from_status="PENDING_ITA",
        to_status="UNDER_REVIEW",
        comment=f"ITA clearance confirmed. Reference: {ita_ref}",
    ))

    _notify(
        user.id, app, "ITA_CLEARED",
        f"ITA clearance received for {app.application_number}. Applicant is cleared — continue the review.",
    )

    db.session.commit()
    return jsonify({
        "ita_cleared":    True,
        "ita_reference":  ita_ref,
        "ita_outcome":    "CLEARED",
        "response_email": response_text,
    }), 200


@officer_bp.route("/applications/<int:app_id>/forward-to-supervisor", methods=["POST"])
@require_officer
def forward_to_supervisor(user, app_id):
    """Forward a decided application to supervisor for sign-off / visibility."""
    app = Application.query.filter_by(id=app_id, assigned_officer_id=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data    = request.get_json() or {}
    comment = data.get("comment", "").strip()

    # Mark as escalated so supervisor sees it in their queue
    prev_status = app.status
    app.status  = "ESCALATED"
    app.escalated_to_supervisor_at = datetime.now(timezone.utc)
    app.escalation_reason = comment or f"Forwarded for supervisor sign-off (was {prev_status})"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="ESCALATION",
        from_status=prev_status,
        to_status="ESCALATED",
        comment=app.escalation_reason,
    ))

    # Notify supervisors at this officer's branch
    from models.supervisor_profile import SupervisorProfile
    officer_profile = user.officerprofile
    branch = officer_profile.branch_code if officer_profile else None
    sup_query = SupervisorProfile.query.filter_by(is_active_staff=True)
    if branch:
        sup_query = sup_query.filter_by(branch_code=branch)
    for sp in sup_query.all():
        _notify(
            sp.user_id_fk, app, "ESCALATION_RECEIVED",
            f"Application {app.application_number} forwarded for supervisor sign-off by officer.",
        )

    drain_queue(user.id)
    db.session.commit()
    return jsonify({"status": app.status}), 200