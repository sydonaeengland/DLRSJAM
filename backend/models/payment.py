from datetime import datetime, timezone
from config.extensions import db


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), default="JMD")

    # PENDING / COMPLETED / FAILED
    status = db.Column(db.String(20), default="PENDING")

    stripe_payment_intent_id = db.Column(db.String(255), nullable=True)
    payment_reference = db.Column(db.String(100), nullable=True)

    paid_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self):
        return f"<Payment {self.status} - App {self.application_fk}>"