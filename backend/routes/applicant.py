import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request
from config.extensions import db
from models.licence_record import LicenceRecord
from models.application import Application
from models.digital_licence import DigitalLicence
from models.application_event import ApplicationEvent
from models.document import Document
from models.face_verification import VerificationResult 
from utils.auth import require_applicant
import uuid
from datetime import datetime, timezone

applicant_bp = Blueprint("applicant", __name__, url_prefix="/api/applicant")


@applicant_bp.route("/licence", methods=["GET"])
@require_applicant
def get_licence(user):
    licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
    if not licence:
        return jsonify({"error": "No licence record found"}), 404

    return jsonify({
        "trn":            licence.trn,
        "firstname":      licence.firstname,
        "lastname":       licence.lastname,
        "date_of_birth":  str(licence.date_of_birth) if licence.date_of_birth else None,
        "sex":            licence.sex,
        "licence_class":  licence.licence_class,
        "status":         licence.status,
        "collectorate":   licence.collectorate,
        "issue_date":     str(licence.issue_date)   if licence.issue_date   else None,
        "expiry_date":    str(licence.expiry_date)  if licence.expiry_date  else None,
        "control_number": licence.control_number,
        "nationality":    licence.nationality,
        "parish":         licence.parish,
        "address_line1":  licence.address_line1,
        "address_line2":  licence.address_line2,
        "occupation":     licence.occupation,
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
            "verification_passed":  a.verification_passed,
        } for a in apps]
    }), 200


@applicant_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_applicant
def get_application(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    events = [{
        "id":           e.id,
        "event_type":   e.event_type,
        "from_status":  e.from_status,
        "to_status":    e.to_status,
        "comment":      e.comment,
        "created_at":   e.created_at.isoformat() if e.created_at else None,
        "triggered_by": e.triggered_by.email if e.triggered_by else None,
    } for e in app.events]

    documents = [{
        "id":                d.id,
        "doc_type":          d.doc_type,
        "doc_subtype":       d.doc_subtype,
        "review_status":     d.review_status,
        "review_comment":    d.review_comment,
        "uploaded_at":       d.uploaded_at.isoformat() if d.uploaded_at else None,
        "original_filename": d.original_filename,
        "version":           d.version,
        "is_current":        d.is_current,
    } for d in app.documents if d.is_current]

    return jsonify({
        "id":                    app.id,
        "application_number":    app.application_number,
        "transaction_type":      app.transaction_type,
        "replacement_reason":    app.replacement_reason,
        "status":                app.status,
        "submitted_at":          app.submitted_at.isoformat() if app.submitted_at else None,
        "created_at":            app.created_at.isoformat()   if app.created_at   else None,
        "fee_amount":            str(app.fee_amount)           if app.fee_amount   else None,
        "payment_reference":     app.payment_reference,
        "payment_confirmed_at":  app.payment_confirmed_at.isoformat() if app.payment_confirmed_at else None,
        "officer_comment":       app.officer_comment,
        "pickup_collectorate":   app.pickup_collectorate.full if app.pickup_collectorate else None,
        "declaration":           app.declaration,
        "address_change_requested": app.address_change_requested,
        "new_address_line1":     app.new_address_line1,
        "new_address_line2":     app.new_address_line2,
        "new_parish":            app.new_parish,
        "events":                events,
        "documents":             documents,
        "verification_passed":      app.verification_passed,
        "liveness_score":           app.liveness_score,
        "face_match_score":         app.face_match_score,
        "verified_at":              app.verified_at.isoformat() if app.verified_at else None,
        "verification_attempts":    app.verification_attempts,
    }), 200


@applicant_bp.route("/applications", methods=["POST"])
@require_applicant
def create_application(user):
    data = request.get_json()
    transaction_type = data.get("transaction_type", "").upper()

    if transaction_type not in ("RENEWAL", "REPLACEMENT", "AMENDMENT"):
        return jsonify({"error": "Invalid transaction type"}), 400

    app_number = f"DL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    application = Application(
        user_id_fk=user.id,
        application_number=app_number,
        transaction_type=transaction_type,
        replacement_reason=data.get("replacement_reason"),
        status="DRAFT",
        declaration=data.get("declaration"),
        address_change_requested=data.get("address_change_requested", False),
        new_address_line1=data.get("new_address_line1"),
        new_address_line2=data.get("new_address_line2"),
        new_parish=data.get("new_parish"),
        pickup_collectorate_code=data.get("pickup_collectorate_code"),
        fee_amount=data.get("fee_amount"),
        trustee_collection=data.get("trustee_collection", False),
        trustee_name=data.get("trustee_name"),
        trustee_contact=data.get("trustee_contact"),
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


@applicant_bp.route("/applications/<int:app_id>/submit", methods=["POST"])
@require_applicant
def submit_application(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if app.status not in ("DRAFT", "ACTION_REQUIRED", "WAITING_ON_APPLICANT"):
        return jsonify({"error": f"Cannot submit application with status {app.status}"}), 400

    prev_status = app.status
    app.status = "SUBMITTED" if prev_status == "DRAFT" else "RESUBMITTED"
    app.submitted_at = datetime.now(timezone.utc)

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="STATUS_CHANGE",
        from_status=prev_status,
        to_status=app.status,
        comment="Submitted by applicant",
    ))
    db.session.commit()

    return jsonify({"status": app.status}), 200


@applicant_bp.route("/applications/<int:app_id>/verify", methods=["POST"])
@require_applicant
def verify_identity(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    # Block if max attempts already reached and still failing
    if (app.verification_attempts or 0) >= 2 and not app.verification_passed:
        return jsonify({
            "error": "Maximum verification attempts reached. Please visit your nearest TAJ collectorate."
        }), 400

    data = request.get_json()
    passed = data.get("passed", False)
    liveness_score   = data.get("liveness_score", 0)
    face_match_score = data.get("face_match_score", 0)
    challenges_used  = data.get("challenges_used", "")

    # Increment attempt count and save scores to Application
    app.verification_attempts = (app.verification_attempts or 0) + 1
    app.verification_passed = passed
    app.liveness_score = liveness_score
    app.face_match_score = face_match_score
    app.verified_at = datetime.now(timezone.utc)

    # Save individual attempt record to VerificationResult
    verification = VerificationResult(
        application_fk=app_id,
        liveness_score=liveness_score,
        face_match_score=face_match_score,
        verification_passed=passed,
        verification_attempts=app.verification_attempts,
        challenges_used=challenges_used
    )
    db.session.add(verification)

    # Max retries reached and still failing — flag for in-person visit
    if not passed and app.verification_attempts >= 2:
        app.status = "ACTION_REQUIRED"
        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=user.id,
            event_type="VERIFICATION_FAILED",
            comment="Max verification attempts reached. In-person verification required at nearest TAJ collectorate."
        ))

    db.session.commit()
    return jsonify({"status": "saved"}), 200


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
            "qr_code_path":   dl.qr_code_path,                                    
            "expiry_date":    str(dl.expiry_date) if dl.expiry_date else None,      
            "generated_at":   dl.generated_at.isoformat() if dl.generated_at else None,
            "application_id": dl.application_fk,
        }
    }), 200
    
    
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
UPLOAD_FOLDER = "uploads"


def allowed_file(filename: str) -> bool:
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@applicant_bp.route("/applications/<int:app_id>/documents", methods=["POST"])
@require_applicant
def upload_document(user, app_id):
    app = Application.query.filter_by(id=app_id, user_id_fk=user.id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file     = request.files["file"]
    doc_type = request.form.get("doc_type", "").strip()

    if not doc_type:
        return jsonify({"error": "doc_type is required"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    # Build a safe file path
    filename  = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_FOLDER, str(app_id), doc_type, filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    file.save(save_path)

    # Mark any previous version of this doc_type as not current
    old_docs = Document.query.filter_by(
        application_fk=app_id,
        doc_type=doc_type,
        is_current=True
    ).all()
    for old in old_docs:
        old.is_current = False

    # Save new document record
    doc = Document(
        application_fk=app_id,
        doc_type=doc_type,
        doc_subtype=request.form.get("doc_subtype"),
        version=len(old_docs) + 1,
        is_current=True,
        file_path=save_path,
        original_filename=file.filename,
        review_status="PENDING"
    )
    db.session.add(doc)
    db.session.flush()

    # If national ID front — run OCR automatically
    if doc_type == "national_id_front":
        from backend.services.verification.ocr_service import process_ocr
        process_ocr(
            application_id=app_id,
            image_path=save_path
        )

    db.session.commit()

    return jsonify({
        "id":                doc.id,
        "doc_type":          doc.doc_type,
        "original_filename": doc.original_filename,
        "version":           doc.version,
        "review_status":     doc.review_status,
    }), 201