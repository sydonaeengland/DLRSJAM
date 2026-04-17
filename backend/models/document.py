from datetime import datetime, timezone
from config.extensions import db

DOC_TYPES = [
    "national_id_front",
    "national_id_back",
    "existing_licence_front",
    "existing_licence_back",
    "police_report",
    "proof_of_address",
    "trustee_letter",
    "licence_photo",
]

ADDRESS_SUBTYPES = [
    "utility_bill",
    "bank_statement",
    "property_tax_receipt",
    "lease_agreement",
    "jp_certified_letter",
    "employer_letter",
]


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )

    doc_type = db.Column(db.String(50), nullable=False)
    doc_subtype = db.Column(db.String(50), nullable=True)

    version = db.Column(db.Integer, nullable=False, default=1)
    is_current = db.Column(db.Boolean, default=True)

    file_path = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=True)

    # AI quality check — runs automatically on upload
    ai_check_passed = db.Column(db.Boolean, nullable=True)
    ai_check_score = db.Column(db.Integer, nullable=True)
    ai_check_comment = db.Column(db.Text, nullable=True)

    # Officer review — set manually by officer
    # PENDING / APPROVED / RESUBMIT_REQUIRED / REJECTED
    review_status = db.Column(db.String(30), default="PENDING")
    review_comment = db.Column(db.Text, nullable=True)

    reviewed_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    reviewed_at = db.Column(db.DateTime, nullable=True)

    uploaded_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    reviewed_by = db.relationship(
        "User",
        foreign_keys=[reviewed_by_user_id]
    )

    def __repr__(self):
        return f"<Document {self.doc_type} v{self.version} - App {self.application_fk}>"