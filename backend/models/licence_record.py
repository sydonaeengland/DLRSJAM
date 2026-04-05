from datetime import datetime, timezone
from config.extensions import db


class LicenceRecord(db.Model):
    __tablename__ = "licence_records"

    id = db.Column(db.Integer, primary_key=True)

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

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

    # Only populated if court has stamped penalties
    judicial_endorsements = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<LicenceRecord user {self.user_id_fk}>"