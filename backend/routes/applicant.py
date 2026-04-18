import os
import json
import base64
import random
import string
import httpx
from datetime import datetime, timezone, date
from flask import Blueprint, jsonify, request, current_app, send_file
from werkzeug.utils import secure_filename
from config.extensions import db
from models.licence_record import LicenceRecord
from models.application import Application
from models.digital_licence import DigitalLicence
from models.application_event import ApplicationEvent
from models.document import Document, DOC_TYPES
from utils.auth import require_applicant

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
        "pickup_collectorate":      app.pickup_collectorate.full if app.pickup_collectorate else None,
        "declaration":              app.declaration,
        "address_change_requested": app.address_change_requested,
        "new_address_line1":        app.new_address_line1,
        "new_address_line2":        app.new_address_line2,
        "new_parish":               app.new_parish,
        "trn_pending_flag":         app.trn_pending_flag if hasattr(app, "trn_pending_flag") else None,
        "trustee_collection":       app.trustee_collection if hasattr(app, "trustee_collection") else False,
        "trustee_name":             app.trustee_name if hasattr(app, "trustee_name") else None,
        "trustee_contact":          app.trustee_contact if hasattr(app, "trustee_contact") else None,
        "events":                   events,
        "documents":                documents,
    }), 200


@applicant_bp.route("/applications", methods=["POST"])
@require_applicant
def create_application(user):
    data = request.get_json()
    transaction_type = data.get("transaction_type", "").upper()

    if transaction_type not in ("RENEWAL", "REPLACEMENT", "AMENDMENT"):
        return jsonify({"error": "Invalid transaction type"}), 400

    if transaction_type == "RENEWAL":
        licence = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        if licence and licence.expiry_date:
            today = date.today()
            days_until_expiry = (licence.expiry_date - today).days
            days_since_expiry = (today - licence.expiry_date).days

            if days_until_expiry > 90:
                return jsonify({
                    "error": f"Your licence cannot be renewed yet. Renewal opens 3 months before expiry. You have {days_until_expiry} days remaining."
                }), 400

            if days_since_expiry > 365:
                return jsonify({
                    "error": "Your licence expired more than 1 year ago. You must re-sit the driving test to obtain a new licence. Please visit your nearest Tax Office."
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
        "pickup_collectorate_code",
        "trustee_collection",
        "trustee_name",
        "trustee_contact",
        "declaration",
        "fee_amount",
        "trn_pending_flag",
    ]

    for field in allowed_fields:
        if field in data and hasattr(app, field):
            setattr(app, field, data[field])

    db.session.commit()
    return jsonify({"status": "updated"}), 200


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

    if file.content_type == "application/pdf":
        return jsonify({"quality": "good", "score": 100, "message": "PDF uploaded — quality check skipped."}), 200

    file_data = base64.standard_b64encode(file.read()).decode("utf-8")

    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "model": "anthropic/claude-haiku-4-5",
                "max_tokens": 200,
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
                            "text": """You are a document quality checker for a government licence renewal portal.

Assess this uploaded document image and respond ONLY with a JSON object in this exact format with no other text:
{"quality": "good"|"warning"|"poor", "score": 0-100, "message": "brief reason in one sentence"}

Scoring guide:
- 90-100 → good: crystal clear, all corners visible, no glare, fully readable
- 60-89  → warning: usable but has minor issues like slight blur, minor glare, or slight crop
- 0-59   → poor: too blurry to read, heavily obscured, wrong document, or not a document at all

For passport-style photos also assess: face clearly visible, plain light background, good even lighting, no shadows across face."""
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


# ── Stripe Payment ────────────────────────────────────────────────────────────

def calculate_fee(app):
    transaction = app.transaction_type
    replacement_reason = app.replacement_reason or ""

    # Look up licence record via user
    licence_record = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    licence_class = licence_record.licence_class if licence_record else "B"

    RENEWAL_B = 540000   # $5,400 JMD in cents
    RENEWAL_C = 720000   # $7,200 JMD in cents
    AMENDMENT = 414000   # $4,140 JMD in cents
    ITA_FEE   = 300000   # $3,000 JMD in cents

    renewal_fee = RENEWAL_C if licence_class == "C" else RENEWAL_B

    if transaction == "RENEWAL":
        return renewal_fee
    if transaction == "AMENDMENT":
        return AMENDMENT
    if transaction == "REPLACEMENT":
        if replacement_reason.upper() == "DAMAGED":
            return renewal_fee
        if licence_record and licence_record.expiry_date:
            if licence_record.expiry_date < date.today():
                return ITA_FEE + renewal_fee
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