# Application model — one row per licence application. Tracks status, officer assignment, documents, payment, verification results, and the officer/supervisor decision.
from datetime import datetime, timezone
from config.extensions import db


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    assigned_officer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )
    assigned_at = db.Column(db.DateTime(timezone=True), nullable=True)

    application_number = db.Column(db.String(30), unique=True, nullable=False)

    transaction_type = db.Column(db.String(30), nullable=False)  # RENEWAL / REPLACEMENT / AMENDMENT

    replacement_reason = db.Column(db.String(30), nullable=True)  # LOST / DAMAGED — replacement only

    # DRAFT / SUBMITTED / UNDER_REVIEW / PENDING_ITA / ACTION_REQUIRED /
    # WAITING_ON_APPLICANT / RESUBMITTED / ESCALATED / APPROVED / REJECTED
    status = db.Column(db.String(30), nullable=False, default="DRAFT")

    submitted_at = db.Column(db.DateTime, nullable=True)

    trn_pending = db.Column(db.Boolean, default=False)
    trn_remark = db.Column(db.Text, nullable=True)

    address_change_requested = db.Column(db.Boolean, default=False)
    new_address_line1 = db.Column(db.String(255), nullable=True)
    new_address_line2 = db.Column(db.String(255), nullable=True)
    new_parish = db.Column(db.String(100), nullable=True)
    address_change_approved = db.Column(db.Boolean, nullable=True)
    address_change_approved_at = db.Column(db.DateTime, nullable=True)

    new_occupation = db.Column(db.String(100), nullable=True)

    # ITA fields — replacement applications only
    ita_request_sent_at = db.Column(db.DateTime, nullable=True)
    ita_response_received_at = db.Column(db.DateTime, nullable=True)
    ita_outcome = db.Column(db.String(20), nullable=True)
    ita_reference = db.Column(db.String(50), nullable=True)

    # trustee / proxy collection
    trustee_collection = db.Column(db.Boolean, default=False)
    trustee_name = db.Column(db.String(200), nullable=True)
    trustee_contact = db.Column(db.String(100), nullable=True)

    payment_reference = db.Column(db.String(50), nullable=True)
    payment_confirmed_at = db.Column(db.DateTime, nullable=True)
    fee_amount = db.Column(db.Numeric(10, 2), nullable=True)

    # pickup location — FK to collectorates.code
    pickup_collectorate_code = db.Column(
        db.String(5),
        db.ForeignKey("collectorates.code"),
        nullable=True
    )

    escalated_to_supervisor_at = db.Column(db.DateTime, nullable=True)
    escalation_reason = db.Column(db.Text, nullable=True)

    officer_decision_at = db.Column(db.DateTime, nullable=True)
    officer_comment = db.Column(db.Text, nullable=True)

    licence_photo_url = db.Column(db.String(500), nullable=True)
    licence_photo_bg_removed = db.Column(db.Boolean, default=False)
    digital_licence_generated_at = db.Column(db.DateTime, nullable=True)

    declaration = db.Column(db.Text, nullable=True)
    signature_image = db.Column(db.Text, nullable=True)
    declaration_signed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    verification_passed = db.Column(db.Boolean, nullable=True)
    liveness_score = db.Column(db.Integer, nullable=True)
    face_match_score = db.Column(db.Integer, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    verification_attempts = db.Column(db.Integer, default=0)
    verification_photo = db.Column(db.Text, nullable=True)
    needs_manual_review = db.Column(db.Boolean, default=False)
    manual_review_reason = db.Column(db.Text, nullable=True)
    reverification_requested = db.Column(db.Boolean, default=False)

    consent_given_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    applicant = db.relationship(
        "User",
        foreign_keys=[user_id_fk],
        back_populates="applications"
    )

    assigned_officer = db.relationship(
        "User",
        foreign_keys=[assigned_officer_id],
        back_populates="assigned_applications"
    )

    pickup_collectorate = db.relationship(
        "Collectorate",
        foreign_keys=[pickup_collectorate_code]
    )

    documents = db.relationship(
        "Document",
        backref="application",
        lazy=True
    )

    events = db.relationship(
        "ApplicationEvent",
        backref="application",
        lazy=True,
        order_by="ApplicationEvent.created_at.asc()"
    )

    face_verification = db.relationship(
        "VerificationResult",
        backref="application",
        uselist=False
    )

    payment = db.relationship(
        "Payment",
        backref="application",
        uselist=False
    )

    digital_licence = db.relationship(
        "DigitalLicence",
        backref="application",
        uselist=False
    )

    ita_correspondence = db.relationship(
        "ITACorrespondence",
        backref="application",
        lazy=True
    )

    def __repr__(self):
        return f"<Application {self.application_number} - {self.status}>"