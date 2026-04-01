from datetime import datetime, timezone
from config.extensions import db

class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    user_id_fk  = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(20), nullable=False)  
    status = db.Column(db.String(20),nullable=False,default="submitted") # under review, rejected, approved
    declaration = db.Column(db.Text, nullable=True)     #lost license declarations      
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))
    applicant = db.relationship("User", back_populates="applications")
    documents = db.relationship("Document", backref="application", lazy=True)
    face_verification = db.relationship("VerificationResult", backref="application", uselist=False)
    payment = db.relationship("Payment", backref="application", uselist=False)
    assignmenty_history = db.relationship("AssignmentHist", backref="application", lazy=True)
    digital_license = db.relationship("License", backref="application", uselist=False)
    
    def __repr__(self):
        return f"<Application {self.id} - {self.status}>"