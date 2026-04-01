from datetime import datetime, timezone
from config.extensions import db


class DigitalLicence(db.Model):
    __tablename__ = "digital_licences"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    photo_url = db.Column(db.String(500), nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    expiry_date = db.Column(db.Date, nullable=False)

    issued_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    owner = db.relationship("User", backref="digital_licences")

    def __repr__(self):
        return f"<DigitalLicence User {self.user_id_fk}>"