# Applicant routes — application CRUD, document upload, verification submission, payment, and digital licence generation.
import os
import json
import base64
import random
import string
import httpx
import threading
from datetime import datetime, timezone, date
from flask import Blueprint, jsonify, request, current_app, send_file
from werkzeug.utils import secure_filename
from config.extensions import db
from models.licence_record import LicenceRecord
from models.application import Application
from models.digital_licence import DigitalLicence
from models.application_event import ApplicationEvent
from models.document import Document, DOC_TYPES
from models.face_verification import VerificationResult
from utils.auth import require_applicant
from utils.assignment import auto_assign_officer
from utils.ocr import run_ocr
from models.notification import Notification


def _notify(recipient_user_id, application, event_type, message):
    try:
        db.session.add(Notification(
            recipient_user_id=recipient_user_id,
            application_fk=application.id,
            event_type=event_type,
            message=message,
        ))
    except Exception:
        pass

applicant_bp = Blueprint("applicant", __name__, url_prefix="/api/applicant")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}


def generate_app_number():
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"DL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{suffix}"


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@applicant_bp.route("/licence", methods=["GET"])
@require_applicant
def get_licence(user):
    licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
    if not licence:
        return jsonify({"error": "No licence record found"}), 404

    return jsonify({
        "trn":               licence.trn,
        "firstname":         licence.firstname,
        "middlename":        licence.middlename,
        "lastname":          licence.lastname,
        "date_of_birth":     str(licence.date_of_birth)    if licence.date_of_birth    else None,
        "sex":               licence.sex,
        "licence_class":     licence.licence_class,
        "status":            licence.status,
        "collectorate":      licence.collectorate,
        "issue_date":        str(licence.issue_date)       if licence.issue_date       else None,
        "first_issue_date":  str(licence.first_issue_date) if licence.first_issue_date else None,
        "expiry_date":       str(licence.expiry_date)      if licence.expiry_date      else None,
        "control_number":    licence.control_number,
        "nationality":       licence.nationality,
        "parish":            licence.parish,
        "address_line1":     licence.address_line1,
        "address_line2":     licence.address_line2,
        "occupation":        licence.occupation,
        "judicial_endorsements": licence.judicial_endorsements or [],
    }), 200


@applicant_bp.route("/applications", methods=["GET"])
@require_applicant
def get_applications(user):
    apps = (
        Application.query
        .filter_by(user_id_fk=user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return jsonify({
        "applications": [{
            "id":                  a.id,
            "application_number":  a.application_number,
            "transaction_type":    a.transaction_type,
            "status":              a.status,
            "submitted_at":        a.submitted_at.isoformat() if a.submitted_at else None,
            "created_at":          a.created_at.isoformat()   if a.created_at   else None,
            "updated_at":          a.updated_at.isoformat()   if a.updated_at   else None,
            "fee_amount":          str(a.fee_amount)           if a.fee_amount   else None,
            "payment_reference":   a.payment_reference,
            "officer_comment":     a.officer_comment,
            "collectorate":        a.pickup_collectorate.full    if a.pickup_collectorate else None,
            "collectorate_address": a.pickup_collectorate.address if a.pickup_collectorate else None,
            "collectorate_lat":    a.pickup_collectorate.lat     if a.pickup_collectorate else None,
            "collectorate_lng":    a.pickup_collectorate.lng     if a.pickup_collectorate else None,
            "signature_image":     a.signature_image,
        } for a in apps]
    }), 200


@applicant_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_applicant
def get_application(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    events = []
    for e in app.events:
        actor = e.triggered_by
        actor_name = None
        if actor:
            op = getattr(actor, "officerprofile", None)
            sp = getattr(actor, "supervisorprofile", None)
            pp = getattr(actor, "profile", None)
            if sp:
                actor_name = f"{sp.firstname} {sp.lastname}"
            elif op:
                actor_name = f"{op.firstname} {op.lastname}"
            elif pp:
                actor_name = f"{pp.firstname} {pp.lastname}"
            else:
                actor_name = actor.email
        events.append({
            "id":           e.id,
            "event_type":   e.event_type,
            "from_status":  e.from_status,
            "to_status":    e.to_status,
            "comment":      e.comment,
            "created_at":   e.created_at.isoformat() if e.created_at else None,
            "triggered_by": actor_name,
        })

    # find the officer who approved or rejected
    officer_decision = None
    for e in sorted(app.events, key=lambda x: x.created_at or datetime.min):
        if e.event_type in ("APPROVED", "REJECTED") and e.triggered_by:
            op = getattr(e.triggered_by, "officerprofile", None)
            if op:
                officer_decision = {
                    "decision":          e.to_status or e.event_type,
                    "officer_name":      f"{op.firstname} {op.lastname}",
                    "officer_staff_id":  op.staff_id,
                    "timestamp":         e.created_at.isoformat() if e.created_at else None,
                    "notes":             e.comment,
                    "officer_signature": op.signature_image,
                }

    # grab supervisor decision if there is one
    supervisor_decision = None
    for e in app.events:
        if e.event_type == "SUPERVISOR_DECISION" and e.triggered_by:
            sp = getattr(e.triggered_by, "supervisorprofile", None)
            supervisor_decision = {
                "decision":            e.to_status,
                "supervisor_name":     f"{sp.firstname} {sp.lastname}" if sp else (e.triggered_by.email if e.triggered_by else "—"),
                "timestamp":           e.created_at.isoformat() if e.created_at else None,
                "notes":               e.comment,
                "supervisor_signature": sp.signature_image if sp else None,
            }

    documents = [{
        "id":                d.id,
        "doc_type":          d.doc_type,
        "doc_subtype":       d.doc_subtype,
        "review_status":     d.review_status,
        "review_comment":    d.review_comment,
        "ai_check_passed":   d.ai_check_passed,
        "ai_check_score":    d.ai_check_score,
        "ai_check_comment":  d.ai_check_comment,
        "uploaded_at":       d.uploaded_at.isoformat() if d.uploaded_at else None,
        "original_filename": d.original_filename,
        "version":           d.version,
        "is_current":        d.is_current,
    } for d in app.documents if d.is_current]

    return jsonify({
        "id":                       app.id,
        "application_number":       app.application_number,
        "transaction_type":         app.transaction_type,
        "replacement_reason":       app.replacement_reason,
        "status":                   app.status,
        "submitted_at":             app.submitted_at.isoformat() if app.submitted_at else None,
        "created_at":               app.created_at.isoformat()   if app.created_at   else None,
        "fee_amount":               str(app.fee_amount)           if app.fee_amount   else None,
        "payment_reference":        app.payment_reference,
        "payment_confirmed_at":     app.payment_confirmed_at.isoformat() if app.payment_confirmed_at else None,
        "officer_comment":          app.officer_comment,
        "pickup_collectorate":      app.pickup_collectorate.full    if app.pickup_collectorate else None,
        "pickup_collectorate_address": app.pickup_collectorate.address if app.pickup_collectorate else None,
        "pickup_collectorate_lat":  app.pickup_collectorate.lat     if app.pickup_collectorate else None,
        "pickup_collectorate_lng":  app.pickup_collectorate.lng     if app.pickup_collectorate else None,
        "declaration":              app.declaration,
        "signature_image":          app.signature_image,
        "address_change_requested": app.address_change_requested,
        "new_address_line1":        app.new_address_line1,
        "new_address_line2":        app.new_address_line2,
        "new_parish":               app.new_parish,
        "trn_pending_flag":         app.trn_pending_flag if hasattr(app, "trn_pending_flag") else None,
        "trustee_collection":       app.trustee_collection if hasattr(app, "trustee_collection") else False,
        "trustee_name":             app.trustee_name if hasattr(app, "trustee_name") else None,
        "trustee_contact":          app.trustee_contact if hasattr(app, "trustee_contact") else None,
        "verification_passed":        app.verification_passed,
        "face_match_score":           app.face_match_score,
        "verified_at":                app.verified_at.isoformat() if app.verified_at else None,
        "verification_attempts":      app.verification_attempts,
        "needs_manual_review":        app.needs_manual_review,
        "reverification_requested":   app.reverification_requested,
        "events":                     events,
        "documents":                  documents,
        "officer_decision":           officer_decision,
        "supervisor_decision":        supervisor_decision,
        "ita_reference":              app.ita_reference,
        "ita_correspondence":         [{
            "direction":      c.direction,
            "subject":        c.subject,
            "ita_reference":  c.ita_reference,
            "outcome":        c.outcome,
            "sent_at":        c.sent_at.isoformat() if c.sent_at else None,
        } for c in sorted(app.ita_correspondence, key=lambda x: x.sent_at or datetime.min)],
    }), 200


@applicant_bp.route("/applications", methods=["POST"])
@require_applicant
def create_application(user):
    data = request.get_json()
    transaction_type = data.get("transaction_type", "").upper()

    if transaction_type not in ("RENEWAL", "REPLACEMENT", "AMENDMENT"):
        return jsonify({"error": "Invalid transaction type"}), 400

    licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()

    if transaction_type == "RENEWAL":
        if licence and licence.expiry_date:
            today = date.today()
            days_until_expiry = (licence.expiry_date - today).days

            if days_until_expiry > 60:
                return jsonify({
                    "error": f"Your licence cannot be renewed yet. Renewal opens 60 days before expiry. You have {days_until_expiry} days remaining."
                }), 400

    if transaction_type in ("REPLACEMENT", "AMENDMENT"):
        if licence and licence.expiry_date and licence.expiry_date < date.today():
            tx_label = "Replacement" if transaction_type == "REPLACEMENT" else "Amendment"
            return jsonify({
                "error": f"{tx_label} applications require a valid (non-expired) licence. Please renew your licence first."
            }), 400

    existing = Application.query.filter_by(
        user_id_fk=user.id,
        transaction_type=transaction_type,
    ).filter(
        Application.status.in_([
            "DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_ITA",
            "RESUBMITTED", "ESCALATED", "WAITING_ON_APPLICANT"
        ])
    ).first()

    if existing:
        return jsonify({
            "error": f"You already have an active {transaction_type.lower()} application ({existing.application_number}).",
            "existing_application_id": existing.id,
            "existing_application_number": existing.application_number,
        }), 409

    application = Application(
        user_id_fk=user.id,
        application_number=generate_app_number(),
        transaction_type=transaction_type,
        replacement_reason=data.get("replacement_reason"),
        status="DRAFT",
        declaration=data.get("declaration"),
        signature_image=data.get("signature_image"),
        address_change_requested=data.get("address_change_requested", False),
        new_address_line1=data.get("new_address_line1"),
        new_address_line2=data.get("new_address_line2"),
        new_parish=data.get("new_parish"),
        new_occupation=data.get("new_occupation"),
        pickup_collectorate_code=data.get("pickup_collectorate_code"),
        fee_amount=data.get("fee_amount"),
        trustee_collection=data.get("trustee_collection", False),
        trustee_name=data.get("trustee_name"),
        trustee_contact=data.get("trustee_contact"),
        consent_given_at=datetime.now(timezone.utc) if data.get("consent_given_at") else None,
    )
    db.session.add(application)
    db.session.flush()

    db.session.add(ApplicationEvent(
        application_fk=application.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status=None,
        to_status="DRAFT",
        comment="Application created",
    ))
    db.session.commit()

    return jsonify({
        "id":                 application.id,
        "application_number": application.application_number,
        "status":             application.status,
    }), 201


@applicant_bp.route("/applications/<int:app_id>", methods=["PATCH"])
@require_applicant
def update_application(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status not in ("DRAFT", "ACTION_REQUIRED", "WAITING_ON_APPLICANT"):
        return jsonify({"error": "Cannot update application with this status"}), 400

    data = request.get_json()

    allowed_fields = [
        "replacement_reason",
        "address_change_requested",
        "new_address_line1",
        "new_address_line2",
        "new_parish",
        "new_occupation",
        "pickup_collectorate_code",
        "trustee_collection",
        "trustee_name",
        "trustee_contact",
        "declaration",
        "signature_image",
        "fee_amount",
        "trn_pending_flag",
    ]

    for field in allowed_fields:
        if field in data and hasattr(app, field):
            setattr(app, field, data[field])

    if "signature_image" in data and data["signature_image"] and not app.declaration_signed_at:
        app.declaration_signed_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"status": "updated"}), 200


@applicant_bp.route("/applications/<int:app_id>/submit", methods=["POST"])
@require_applicant
def submit_application(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status not in ("ACTION_REQUIRED", "WAITING_ON_APPLICANT"):
        return jsonify({"error": "This endpoint is for resubmissions only. New applications must go through payment."}), 400

    prev_status = app.status
    app.status = "RESUBMITTED"
    app.submitted_at = datetime.now(timezone.utc)

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status=prev_status,
        to_status=app.status,
        comment="Resubmitted by applicant",
    ))

    # try to assign an officer in case a slot opened up since the original submission
    if not app.assigned_officer_id:
        auto_assign_officer(app)

    if app.assigned_officer_id:
        _notify(
            app.assigned_officer_id, app, "RESUBMITTED",
            f"Applicant has resubmitted documents for {app.application_number}. Ready for re-review.",
        )

    db.session.commit()

    return jsonify({"status": app.status}), 200


@applicant_bp.route("/applications/<int:app_id>/verify", methods=["POST"])
@require_applicant
def verify_identity(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json(force=True) or {}
    passed              = data.get("passed", False)

    if (app.verification_attempts or 0) >= 3 and not app.verification_passed and not passed:
        return jsonify({
            "error": "Maximum verification attempts reached."
        }), 400
    liveness_score      = data.get("liveness_score", 0)
    face_match_score    = data.get("face_match_score", 0)
    challenges_used     = data.get("challenges_used", "")
    verification_photo  = data.get("verification_photo")
    independence_score  = data.get("independence_score")
    depth_score         = data.get("depth_score")
    texture_score       = data.get("texture_score")
    challenges_passed   = data.get("challenges_passed")
    challenges_total    = data.get("challenges_total")
    fail_reason         = data.get("fail_reason", "")
    lighting_ok         = data.get("lighting_ok", True)
    rppg_bpm            = data.get("rppg_bpm")
    sharpness_score     = data.get("sharpness_score")

    app.verification_attempts = (app.verification_attempts or 0) + 1
    app.verification_passed   = passed
    app.liveness_score        = liveness_score
    app.face_match_score      = face_match_score
    app.verified_at           = datetime.now(timezone.utc)
    app.verification_photo    = verification_photo

    if passed:
        app.needs_manual_review      = False
        app.manual_review_reason     = None
        app.reverification_requested = False
    else:
        app.needs_manual_review  = True
        app.manual_review_reason = fail_reason if fail_reason else "Liveness verification failed"

    verification = VerificationResult(
        application_fk=app_id,
        liveness_score=liveness_score,
        face_match_score=face_match_score,
        liveness_passed=passed,
    )
    db.session.add(verification)

    # pack all scores into the event comment so the officer can see them
    score_parts = [f"Liveness: {liveness_score}"]
    if challenges_passed is not None and challenges_total is not None:
        score_parts.append(f"Challenges: {challenges_passed}/{challenges_total}")
    if challenges_used:
        score_parts.append(f"Used: {challenges_used}")
    if independence_score is not None:
        score_parts.append(f"Eye independence: {independence_score}")
    if depth_score is not None:
        score_parts.append(f"Face depth: {depth_score}")
    if texture_score is not None:
        score_parts.append(f"Texture: {texture_score}")
    if face_match_score:
        score_parts.append(f"Face match: {face_match_score}")
    if rppg_bpm:
        score_parts.append(f"BPM: {rppg_bpm}")
    if sharpness_score is not None:
        score_parts.append(f"Sharpness: {sharpness_score}")
    if not lighting_ok:
        score_parts.append("POOR LIGHTING detected")
    score_summary = " | ".join(score_parts)

    if passed:
        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=user.id,
            event_type="VERIFICATION_PASSED",
            comment=f"Liveness verification passed. {score_summary}.",
        ))
    else:
        fail_detail = fail_reason if fail_reason else "See scores."
        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=user.id,
            event_type="VERIFICATION_ATTEMPT_FAILED",
            comment=f"Liveness verification attempt {app.verification_attempts} failed. {fail_detail} Scores — {score_summary}.",
        ))

    if not passed and app.verification_attempts >= 3:
        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=user.id,
            event_type="VERIFICATION_FAILED",
            comment="Max verification attempts reached. Applicant may continue without liveness verification.",
        ))

    db.session.commit()
    return jsonify({"status": "saved"}), 200


@applicant_bp.route("/applications/<int:app_id>/documents", methods=["POST"])
@require_applicant
def upload_document(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status not in ("DRAFT", "ACTION_REQUIRED", "WAITING_ON_APPLICANT"):
        return jsonify({"error": "Cannot upload documents for this application"}), 400

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    doc_type = request.form.get("doc_type", "").strip()
    doc_subtype = request.form.get("doc_subtype", "").strip() or None

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use JPG, PNG or PDF"}), 400

    if doc_type not in DOC_TYPES:
        return jsonify({"error": f"Invalid doc_type: {doc_type}"}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"error": "File too large. Maximum size is 5MB"}), 400

    upload_folder = os.path.join(current_app.root_path, "uploads", str(app_id))
    os.makedirs(upload_folder, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = secure_filename(f"{app_id}_{user.id}_{doc_type}_{timestamp}.{ext}")
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    existing = Document.query.filter_by(
        application_fk=app_id,
        doc_type=doc_type,
        doc_subtype=doc_subtype,
        is_current=True,
    ).first()

    next_version = 1
    if existing:
        existing.is_current = False
        next_version = existing.version + 1

    doc = Document(
        application_fk=app_id,
        doc_type=doc_type,
        doc_subtype=doc_subtype,
        version=next_version,
        is_current=True,
        file_path=file_path,
        original_filename=file.filename,
        review_status="PENDING",
        ai_check_passed=None,
        ai_check_score=None,
        ai_check_comment=None,
    )
    db.session.add(doc)
    db.session.commit()

    # run OCR in the background so the upload response isn't held up
    doc_id       = doc.id
    saved_path   = file_path
    saved_type   = doc_type
    app_ctx      = current_app._get_current_object()

    def _run_ocr_bg():
        with app_ctx.app_context():
            result = run_ocr(saved_path, saved_type)
            target = Document.query.get(doc_id)
            if target:
                fields = result.get("fields", {})
                target.ocr_ran        = result["ran"]
                target.ocr_fields     = fields if fields else None
                target.ocr_name       = fields.get("name")
                target.ocr_dob        = fields.get("dob")
                target.ocr_id_number  = fields.get("trn") or fields.get("control_number")
                target.ocr_confidence = result["confidence"]
                target.ocr_raw_text   = result.get("raw_text")
                db.session.commit()

    threading.Thread(target=_run_ocr_bg, daemon=True).start()

    return jsonify({
        "id":                doc.id,
        "doc_type":          doc.doc_type,
        "doc_subtype":       doc.doc_subtype,
        "version":           doc.version,
        "original_filename": doc.original_filename,
        "uploaded_at":       doc.uploaded_at.isoformat(),
    }), 201


@applicant_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/file", methods=["GET"])
@require_applicant
def get_document_file(user, app_id, doc_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    doc = Document.query.filter_by(id=doc_id, application_fk=app_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if not os.path.exists(doc.file_path):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(doc.file_path)


@applicant_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/ai-result", methods=["PATCH"])
@require_applicant
def save_ai_result(user, app_id, doc_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    doc = Document.query.filter_by(id=doc_id, application_fk=app_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json()
    doc.ai_check_passed  = data.get("ai_check_passed")
    doc.ai_check_score   = data.get("ai_check_score")
    doc.ai_check_comment = data.get("ai_check_comment")
    db.session.commit()

    return jsonify({"status": "saved"}), 200


@applicant_bp.route("/documents/quality-check", methods=["POST"])
@require_applicant
def quality_check(user):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    doc_type = request.form.get("doc_type", "document")

    if file.content_type == "application/pdf":
        return jsonify({"quality": "good", "score": 100, "message": "PDF uploaded — quality check skipped."}), 200

    file_data = base64.standard_b64encode(file.read()).decode("utf-8")

    is_photo = "photo" in doc_type.lower()

    if is_photo:
        prompt = """You are a document quality checker for the Tax Administration Jamaica (TAJ) driver's licence renewal portal.

This image is a passport-style licence photo submitted by an applicant. Assess it against TAJ requirements and respond ONLY with a JSON object in this exact format with no other text:
{"quality": "good"|"warning"|"poor", "score": 0-100, "message": "specific actionable feedback"}

TAJ licence photo requirements:
- Face clearly visible, centred, looking directly at the camera
- Plain white or light background — no patterns, objects, or other people visible
- Even lighting with no shadows across the face or background
- Full head visible from crown to chin, including ears
- No sunglasses, hats, or head coverings (unless for verified religious reasons)
- Neutral expression, mouth closed
- Photo must be recent and clear — not a photo of a photo or screenshot
- No blur, pixelation, or heavy compression

Scoring guide:
- 90-100 → good: meets all TAJ requirements
- 60-89  → warning: minor issue present but usable
- 0-59   → poor: fails one or more key requirements

For the message field: be specific and actionable so the officer can tell the applicant exactly what to fix. For example: "The background is not plain white — the applicant should retake the photo against a plain white or off-white wall." or "The photo is slightly blurry — the applicant should retake it in good lighting, holding the camera steady." If it passes, confirm what looks good."""
    else:
        prompt = """You are a document quality checker for the Tax Administration Jamaica (TAJ) driver's licence renewal portal.

This image is an identity or supporting document submitted by an applicant. Assess its quality and respond ONLY with a JSON object in this exact format with no other text:
{"quality": "good"|"warning"|"poor", "score": 0-100, "message": "specific actionable feedback"}

Document quality requirements:
- All text must be fully legible and readable
- All four corners of the document must be visible — nothing cropped
- No glare, reflections, or heavy shadows obscuring any part of the document
- Image must not be blurry or pixelated
- The correct document must be uploaded — it should be an official identity or supporting document
- Document must not be expired where expiry is visible and relevant

Scoring guide:
- 90-100 → good: clear, complete, fully readable
- 60-89  → warning: minor issues but the document is still usable
- 0-59   → poor: fails a key requirement and must be resubmitted

For the message field: be specific and actionable. For example: "The top-right corner of the document is cropped — the applicant should retake the photo ensuring the full document is visible." If it passes, confirm what looks good."""

    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "model": "anthropic/claude-haiku-4-5",
                "max_tokens": 300,
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{file.content_type};base64,{file_data}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }]
            },
            timeout=30.0
        )

        current_app.logger.info(f"OpenRouter response: {response.text}")
        text = response.json()["choices"][0]["message"]["content"]
        clean = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f"Quality check error: {e}")
        return jsonify({"quality": "good", "score": 75, "message": "Quality check unavailable — proceeding."}), 200


@applicant_bp.route("/digital-licence/backfill", methods=["POST"])
@require_applicant
def backfill_digital_licence(user):
    """for applications approved before auto-generation existed — creates the digital licence and fixes the licence record dates."""
    from dateutil.relativedelta import relativedelta

    app = (
        Application.query
        .filter_by(user_id_fk=user.id, status="APPROVED")
        .order_by(Application.officer_decision_at.desc())
        .first()
    )
    if not app:
        return jsonify({"error": "No approved application found"}), 404

    from routes.officer import _remove_bg_for_app
    if not app.digital_licence:
        # no digital licence yet — this is a genuine backfill, update the licence record too
        licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        if licence:
            from datetime import date as _date
            from routes.officer import generate_control_number as _gcn
            try:
                licence.control_number = _gcn(licence.collectorate)
            except Exception:
                pass
            licence.issue_date  = _date.today()
            licence.expiry_date = _date.today() + relativedelta(years=5)
            licence.status      = "ACTIVE"
            if app.address_change_requested and app.new_address_line1:
                licence.address_line1 = app.new_address_line1
                licence.address_line2 = app.new_address_line2
                licence.parish        = app.new_parish
            if app.new_occupation:
                licence.occupation = app.new_occupation
        photo_url = _remove_bg_for_app(app)
        db.session.add(DigitalLicence(
            application_fk=app.id,
            user_id_fk=user.id,
            photo_url=photo_url,
        ))
        app.digital_licence_generated_at = datetime.now(timezone.utc)
        _notify(
            user.id, app, "DIGITAL_LICENCE_GENERATED",
            f"Your digital licence has been generated for application {app.application_number}. You can view it on your dashboard.",
        )
    elif not app.digital_licence.photo_url:
        # row already exists but photo was missing — just patch it in
        app.digital_licence.photo_url = _remove_bg_for_app(app)

    db.session.commit()
    return jsonify({"ok": True}), 200


@applicant_bp.route("/digital-licence/latest", methods=["GET"])
@require_applicant
def get_latest_digital_licence(user):
    dl = (
        DigitalLicence.query
        .filter_by(user_id_fk=user.id)
        .order_by(DigitalLicence.generated_at.desc())
        .first()
    )
    if not dl:
        return jsonify({"digital_licence": None}), 200

    return jsonify({
        "digital_licence": {
            "id":             dl.id,
            "photo_url":      dl.photo_url,
            "generated_at":   dl.generated_at.isoformat() if dl.generated_at else None,
            "application_id": dl.application_fk,
        }
    }), 200


@applicant_bp.route("/digital-licence/photo/<int:app_id>", methods=["GET"])
@require_applicant
def serve_digital_licence_photo(user, app_id):
    """serves the bg-removed licence photo PNG."""
    dl = DigitalLicence.query.filter_by(
        application_fk=app_id,
        user_id_fk=user.id,
    ).first()
    if not dl:
        return jsonify({"error": "Not found"}), 404

    upload_folder = os.path.join(current_app.root_path, "uploads", str(app_id))
    out_path = os.path.join(upload_folder, "licence_photo_nobg.png")
    if not os.path.exists(out_path):
        return jsonify({"error": "Photo not found"}), 404

    return send_file(out_path, mimetype="image/png")


# stripe payment

def calculate_fee(app):
    transaction = app.transaction_type

    licence_record = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    licence_class = licence_record.licence_class if licence_record else "B"

    RENEWAL_B = 540000
    RENEWAL_C = 720000
    AMENDMENT = 414000
    ITA_FEE   = 300000

    renewal_fee = RENEWAL_C if licence_class == "C" else RENEWAL_B

    if transaction == "RENEWAL":
        return renewal_fee
    if transaction == "AMENDMENT":
        return AMENDMENT
    if transaction == "REPLACEMENT":
        return ITA_FEE
    return renewal_fee


@applicant_bp.route("/applications/<int:app_id>/create-payment-intent", methods=["POST"])
@require_applicant
def create_payment_intent(user, app_id):
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    amount_cents = calculate_fee(app)

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="jmd",
            metadata={
                "application_id": app.id,
                "application_number": app.application_number,
                "user_id": user.id,
                "transaction_type": app.transaction_type,
            },
            description=f"DLRSJAM — {app.transaction_type} — {app.application_number}",
        )

        app.fee_amount = amount_cents / 100
        db.session.commit()

        return jsonify({
            "client_secret": intent.client_secret,
            "amount": amount_cents,
            "amount_display": f"${amount_cents / 100:,.2f}",
            "currency": "JMD",
            "payment_intent_id": intent.id,
        }), 200

    except stripe.error.StripeError as e:
        return jsonify({"error": str(e.user_message)}), 400


@applicant_bp.route("/applications/<int:app_id>/confirm-payment", methods=["POST"])
@require_applicant
def confirm_payment(user, app_id):
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json()
    payment_intent_id = data.get("payment_intent_id")

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != "succeeded":
            return jsonify({"error": "Payment not completed"}), 400

        from models.payment import Payment
        payment = Payment(
            application_fk=app.id,
            amount=app.fee_amount,
            currency="JMD",
            status="COMPLETED",
            stripe_payment_intent_id=payment_intent_id,
            payment_reference=app.application_number,
            paid_at=datetime.now(timezone.utc),
        )
        db.session.add(payment)

        app.status = "SUBMITTED"
        app.payment_reference = payment_intent_id
        app.payment_confirmed_at = datetime.now(timezone.utc)
        app.submitted_at = datetime.now(timezone.utc)

        auto_assign_officer(app)

        if app.assigned_officer_id:
            _notify(
                app.assigned_officer_id, app, "SUBMITTED",
                f"New application {app.application_number} has been submitted and assigned to you.",
            )

        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=user.id,
            event_type="PAYMENT_CONFIRMED",
            from_status="DRAFT",
            to_status="SUBMITTED",
            comment=f"Payment confirmed via Stripe. Intent: {payment_intent_id}",
        ))
        db.session.commit()

        return jsonify({
            "success": True,
            "application_number": app.application_number,
            "status": app.status,
        }), 200

    except stripe.error.StripeError as e:
        return jsonify({"error": str(e.user_message)}), 400


@applicant_bp.route("/liveness-check", methods=["POST"])
@require_applicant
def liveness_check(user):
    """
    Accepts a base64-encoded JPEG frame from the frontend during verification.
    Runs DeepFace anti-spoofing and returns a real/spoof score.
    Called once mid-session — result is used as an additional hard gate.
    """
    import tempfile, numpy as np, cv2
    from deepface import DeepFace

    data = request.get_json(silent=True) or {}
    frame_b64 = data.get("frame")
    if not frame_b64:
        return jsonify({"error": "No frame provided"}), 400

    try:
        # Decode base64 → JPEG bytes → numpy array → BGR image
        header, _, b64data = frame_b64.partition(",")
        img_bytes = base64.b64decode(b64data if b64data else frame_b64)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Could not decode image"}), 400

        # Write to temp file — DeepFace works best with file paths
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            cv2.imwrite(tmp.name, img)
            tmp_path = tmp.name

        result = DeepFace.extract_faces(
            img_path=tmp_path,
            anti_spoofing=True,
            enforce_detection=False,
        )
        os.unlink(tmp_path)

        if not result:
            return jsonify({"is_real": False, "score": 0.0, "reason": "no_face"}), 200

        face = result[0]
        is_real = bool(face.get("is_real", False))
        score   = float(face.get("antispoof_score", 0.0))
        return jsonify({"is_real": is_real, "score": round(score, 4)}), 200

    except Exception as e:
        # Non-fatal — frontend falls back to geometry-only if this fails
        return jsonify({"is_real": None, "score": None, "reason": str(e)}), 200


@applicant_bp.route("/profile", methods=["GET"])
@require_applicant
def get_profile(user):
    from models.applicant_profile import Profile
    profile = Profile.query.filter_by(user_id_fk=user.id).first()
    return jsonify({
        "email": user.email,
        "phone": profile.phone if profile else None,
    }), 200


@applicant_bp.route("/profile", methods=["PATCH"])
@require_applicant
def update_profile(user):
    from models.applicant_profile import Profile
    from werkzeug.security import check_password_hash
    data = request.get_json() or {}

    new_email = data.get("email", "").strip().lower()
    new_phone = data.get("phone", "").strip()

    # Password required only when email is actually changing
    if new_email and new_email != user.email:
        password = data.get("password", "").strip()
        if not password:
            return jsonify({"error": "Your current password is required to change your email."}), 400
        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Incorrect password. Email not updated."}), 403
        from models.user import User as UserModel
        conflict = UserModel.query.filter_by(email=new_email).first()
        if conflict:
            return jsonify({"error": "That email address is already in use."}), 409
        user.email = new_email

    profile = Profile.query.filter_by(user_id_fk=user.id).first()
    if profile:
        if new_phone is not None:
            profile.phone = new_phone or None
        profile.email = user.email  # keep in sync

    db.session.commit()
    return jsonify({"email": user.email, "phone": profile.phone if profile else None}), 200


# ── DPA compliance ────────────────────────────────────────────────────────────

@applicant_bp.route("/data-export", methods=["GET"])
@require_applicant
def data_export(user):
    from models.applicant_profile import Profile
    from models.notification import Notification

    profile = Profile.query.filter_by(user_id_fk=user.id).first()
    licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
    apps    = Application.query.filter_by(user_id_fk=user.id).order_by(Application.created_at.desc()).all()
    notifs  = Notification.query.filter_by(recipient_user_id=user.id).order_by(Notification.created_at.desc()).limit(100).all()

    return jsonify({
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {
            "email":      user.email,
            "created_at": user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else None,
        },
        "profile": {
            "firstname":    profile.firstname    if profile else None,
            "lastname":     profile.lastname     if profile else None,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "phone":        profile.phone        if profile else None,
            "address_line1": profile.address_line1 if profile else None,
            "address_line2": profile.address_line2 if profile else None,
            "parish":       profile.parish       if profile else None,
            "sex":          profile.sex          if profile else None,
            "occupation":   profile.occupation   if profile else None,
        },
        "licence_record": {
            "trn":           licence.trn           if licence else None,
            "control_number": licence.control_number if licence else None,
            "licence_class": licence.licence_class  if licence else None,
            "expiry_date":   str(licence.expiry_date) if licence and licence.expiry_date else None,
            "collectorate":  licence.collectorate   if licence else None,
        },
        "applications": [{
            "application_number": a.application_number,
            "transaction_type":   a.transaction_type,
            "status":             a.status,
            "submitted_at":       a.submitted_at.isoformat() if a.submitted_at else None,
            "created_at":         a.created_at.isoformat()   if a.created_at   else None,
            "consent_given_at":   a.consent_given_at.isoformat() if a.consent_given_at else None,
            "verification_passed": a.verification_passed,
            "face_match_score":   a.face_match_score,
            "liveness_score":     a.liveness_score,
            "documents": [{
                "doc_type":   d.doc_type,
                "uploaded_at": d.created_at.isoformat() if d.created_at else None,
            } for d in a.documents],
        } for a in apps],
        "notifications": [{
            "event_type": n.event_type,
            "message":    n.message,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "is_read":    n.is_read,
        } for n in notifs],
    }), 200


@applicant_bp.route("/account", methods=["DELETE"])
@require_applicant
def delete_account(user):
    from models.applicant_profile import Profile
    from werkzeug.security import check_password_hash
    import hashlib

    data     = request.get_json() or {}
    password = data.get("password", "")

    if not password:
        return jsonify({"error": "Password is required to delete your account"}), 400
    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Incorrect password"}), 403

    # Block deletion while any application is actively being processed
    active_statuses = {"SUBMITTED", "UNDER_REVIEW", "PENDING_ITA", "ACTION_REQUIRED",
                       "WAITING_ON_APPLICANT", "RESUBMITTED", "ESCALATED"}
    active = Application.query.filter(
        Application.user_id_fk == user.id,
        Application.status.in_(active_statuses)
    ).first()
    if active:
        return jsonify({
            "error": "You have an application currently in progress. "
                     "It must be completed, approved, or rejected before your account can be deleted."
        }), 409

    anon_hash = hashlib.sha256(str(user.id).encode()).hexdigest()[:16]

    # Anonymise biometric and personal data on all applications
    for app in Application.query.filter_by(user_id_fk=user.id).all():
        app.verification_photo  = None
        app.face_match_score    = None
        app.liveness_score      = None
        app.verification_passed = None
        app.manual_review_reason = None
        app.officer_comment     = None
        app.declaration         = None
        app.signature_image     = None
        app.trustee_name        = None
        app.trustee_contact     = None

    # Anonymise profile
    profile = Profile.query.filter_by(user_id_fk=user.id).first()
    if profile:
        profile.firstname    = f"[deleted-{anon_hash}]"
        profile.lastname     = ""
        profile.phone        = None
        profile.address_line1 = None
        profile.address_line2 = None
        profile.email        = None

    # Anonymise user account — deactivate rather than hard delete to preserve FK refs
    user.email         = f"deleted-{anon_hash}@redacted.dlrsjam"
    user.password_hash = ""
    user.is_active     = False

    db.session.commit()
    return jsonify({"message": "Account deleted and personal data removed"}), 200