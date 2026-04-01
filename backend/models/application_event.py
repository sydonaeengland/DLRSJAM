from datetime import datetime, timezone
from config.extensions import db


class ApplicationEvent(db.Model):
    __tablename__ = "application_events"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )

    triggered_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # STATUS_CHANGE / ASSIGNMENT / DOCUMENT_REVIEW /
    # ESCALATION / ITA_REQUEST / ITA_RESPONSE
    event_type = db.Column(db.String(30), nullable=False)

    from_status = db.Column(db.String(30), nullable=True)
    to_status = db.Column(db.String(30), nullable=True)

    assigned_to_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    triggered_by = db.relationship(
        "User",
        foreign_keys=[triggered_by_user_id]
    )

    assigned_to = db.relationship(
        "User",
        foreign_keys=[assigned_to_user_id]
    )

    def __repr__(self):
        return f"<ApplicationEvent {self.event_type} - App {self.application_fk}>"