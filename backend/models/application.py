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

    application_number = db.Column(db.String(30), unique=True, nullable=False)

    # RENEWAL / REPLACEMENT / AMENDMENT
    transaction_type = db.Column(db.String(30), nullable=False)

    # LOST / DAMAGED (replacement only)
    replacement_reason = db.Column(db.String(30), nullable=True)
    
    # DRAFT / SUBMITTED / UNDER_REVIEW / PENDING_ITA /
    # # ACTION_REQUIRED / WAITING_ON_APPLICANT / RESUBMITTED / 
    # ESCALATED / APPROVED / REJECTED
    status = db.Column(db.String(30), nullable=False, default="DRAFT")

    submitted_at = db.Column(db.DateTime, nullable=True)

    # TRN pending flag
    trn_pending = db.Column(db.Boolean, default=False)
    trn_remark = db.Column(db.Text, nullable=True)

    # Address change
    address_change_requested = db.Column(db.Boolean, default=False)
    new_address_line1 = db.Column(db.String(255), nullable=True)
    new_address_line2 = db.Column(db.String(255), nullable=True)
    new_parish = db.Column(db.String(100), nullable=True)
    address_change_approved = db.Column(db.Boolean, nullable=True)
    address_change_approved_at = db.Column(db.DateTime, nullable=True)

    # ITA (replacement / lost only)
    ita_request_sent_at = db.Column(db.DateTime, nullable=True)
    ita_response_received_at = db.Column(db.DateTime, nullable=True)
    ita_outcome = db.Column(db.String(20), nullable=True)
    ita_reference = db.Column(db.String(50), nullable=True)

    # Trustee / proxy collection
    trustee_collection = db.Column(db.Boolean, default=False)
    trustee_name = db.Column(db.String(200), nullable=True)
    trustee_contact = db.Column(db.String(100), nullable=True)

    # Payment
    payment_reference = db.Column(db.String(50), nullable=True)
    payment_confirmed_at = db.Column(db.DateTime, nullable=True)
    fee_amount = db.Column(db.Numeric(10, 2), nullable=True)

    # Pickup — FK to collectorates.code
    pickup_collectorate_code = db.Column(
        db.String(5),
        db.ForeignKey("collectorates.code"),
        nullable=True
    )

    # Escalation
    escalated_to_supervisor_at = db.Column(db.DateTime, nullable=True)
    escalation_reason = db.Column(db.Text, nullable=True)

    # Officer decision
    officer_decision_at = db.Column(db.DateTime, nullable=True)
    officer_comment = db.Column(db.Text, nullable=True)

    # Digital licence
    licence_photo_url = db.Column(db.String(500), nullable=True)
    licence_photo_bg_removed = db.Column(db.Boolean, default=False)
    digital_licence_generated_at = db.Column(db.DateTime, nullable=True)

    # Declaration
    declaration = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
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