from datetime import datetime, timezone
from config.extensions import db


class ITACorrespondence(db.Model):
    __tablename__ = "ita_correspondence"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )

    officer_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # OUTGOING / INCOMING
    direction = db.Column(db.String(10), nullable=False)

    subject = db.Column(db.String(255), nullable=True)
    body = db.Column(db.Text, nullable=True)

    ita_reference = db.Column(db.String(50), nullable=True)
    outcome = db.Column(db.String(20), nullable=True)  # CLEARED / NOT_CLEARED

    sent_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    officer = db.relationship(
        "User",
        foreign_keys=[officer_user_id]
    )

    def __repr__(self):
        return f"<ITACorrespondence {self.direction} - App {self.application_fk}>"