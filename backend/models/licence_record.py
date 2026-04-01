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

    # TAJ licence data retrieved during TRN lookup
    licence_number = db.Column(db.String(30), unique=True, nullable=False)
    control_number = db.Column(db.String(30), nullable=True)

    # GENERAL / PRIVATE
    licence_type = db.Column(db.String(30), nullable=False, default="PRIVATE")

    # Class 1-7
    licence_class = db.Column(db.String(10), nullable=False, default="5")

    issue_date = db.Column(db.Date, nullable=True)
    first_issue_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=False)

    # ACTIVE / EXPIRED / SUSPENDED / REVOKED
    status = db.Column(db.String(30), nullable=False, default="ACTIVE")

    collectorate = db.Column(db.String(100), nullable=True)
    place_of_birth = db.Column(db.String(100), nullable=True)
    nationality = db.Column(db.String(50), nullable=True)
    sex = db.Column(db.String(1), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    restrictions = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<LicenceRecord {self.licence_number}>"