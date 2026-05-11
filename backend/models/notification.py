# Notification model — in-app notifications sent to applicants, officers, and supervisors on key status changes.
from config.extensions import db
from datetime import datetime, timezone

class Notification(db.Model):
    __tablename__ = "notifications"

    id                = db.Column(db.Integer, primary_key=True)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    application_fk    = db.Column(db.Integer, db.ForeignKey("applications.id"), nullable=False)
    event_type        = db.Column(db.String(50), nullable=False)
    message           = db.Column(db.String(255), nullable=False)
    is_read           = db.Column(db.Boolean, default=False)
    created_at        = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recipient   = db.relationship("User",        foreign_keys=[recipient_user_id], overlaps="notifications")
    application = db.relationship("Application", foreign_keys=[application_fk],   overlaps="notifications")