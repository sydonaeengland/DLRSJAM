from datetime import datetime, timezone
from config.extensions import db


class VerificationResult(db.Model):
    __tablename__ = "verification_results"

    id = db.Column(db.Integer, primary_key=True)

    application_fk = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False
    )
    #OCR
    ocr_name = db.Column(db.String(100))
    ocr_dob = db.Column(db.Date)
    ocr_id_number = db.Column(db.String(50))
    ocr_address = db.Column(db.String(255))
    ocr_confidence = db.Column(db.Float)
    requires_manual_review = db.Column(db.Boolean, default=False)
    ocr_ran_at = db.Column(
        db.DateTime, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    #Face verification
    liveness_score = db.Column(db.Integer, nullable=True)
    face_match_score = db.Column(db.Integer, nullable=True)
    verification_passed = db.Column(db.Boolean, nullable=True)
    verification_attempts = db.Column(db.Integer, default=0)
    challenges_used = db.Column(db.String(100), nullable=True)
    verified_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self):
        return f"<VerificationResult App {self.application_fk} - passed={self.verification_passed}>"