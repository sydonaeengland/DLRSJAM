from datetime import datetime, timezone
from config.extensions import db

class License(db.Model):
    __tablename__ = "digital_licenses"

    id = db.Column(db.Integer, primary_key=True)
    application_fk  = db.Column(db.Integer, db.ForeignKey("applications.id"), nullable=False)
    user_id_fk = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)  
    qr_code_path = db.Column(db.String(255), nullable=True) 
    issued_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expiry_date = db.Column(db.Date, nullable=False)
    owner = db.relationship("User", backref="licenses")

    def __repr__(self):
        return f"<DigitalLicense User {self.user_id_fk}>"