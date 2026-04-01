from datetime import datetime, timezone
from config.extensions import db

class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    application_fk = db.Column(db.Integer, db.ForeignKey("applications.id"), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False) 
    file_path = db.Column(db.String(255), nullable=False) 
    uploaded_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Document {self.doc_type} - App {self.application_fk}>"