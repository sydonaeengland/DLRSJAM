from datetime import datetime, timezone
from config.extensions import db


class LicenceRecord(db.Model):
    __tablename__ = "licence_records"

    id = db.Column(db.Integer, primary_key=True)

    # TRN is the natural identifier — exists before any user account
    trn = db.Column(db.String(20), unique=True, nullable=False, index=True)

    # ── Front of card ─────────────────────────────────────────────────────

    # A = Motorcycle / B = Private / C = General
    licence_class = db.Column(db.String(2), nullable=False, default="B")

    issue_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=False)

    # ACTIVE / EXPIRED / SUSPENDED / REVOKED
    status = db.Column(db.String(30), nullable=False, default="ACTIVE")

    collectorate = db.Column(db.String(100), nullable=True)

    # ── Back of card ──────────────────────────────────────────────────────

    control_number = db.Column(db.String(30), nullable=True)
    first_issue_date = db.Column(db.Date, nullable=True)
    nationality = db.Column(db.String(50), nullable=True)

    # [{"date": "2024-03-15", "description": "Speeding offence"}]
    judicial_endorsements = db.Column(db.JSON, nullable=True)

    # ── Personal details from TAJ system ─────────────────────────────────

    firstname = db.Column(db.String(50), nullable=True)
    lastname = db.Column(db.String(50), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    sex = db.Column(db.String(1), nullable=True)
    place_of_birth = db.Column(db.String(100), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    address_line1 = db.Column(db.String(100), nullable=True)
    address_line2 = db.Column(db.String(100), nullable=True)
    parish = db.Column(db.String(50), nullable=True)

    # ── Link to user account ──────────────────────────────────────────────
    # NULL until someone registers and claims this licence record

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        unique=True
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship(
        "User",
        back_populates="licence_record"
    )

    def __repr__(self):
        return f"<LicenceRecord TRN:{self.trn}>"