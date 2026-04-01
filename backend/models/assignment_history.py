from datetime import datetime, timezone
from config.extensions import db

class AssignmentHist(db.Model):
    __tablename__ = "assignment_history"

    id = db.Column(db.Integer, primary_key=True)
    application_fk = db.Column(db.Integer, db.ForeignKey("applications.id"), nullable=False)
    officer_id_fk = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False)  # 'approved', 'rejected', 'resubmission_required'
    comments = db.Column(db.Text, nullable=True)
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    officer = db.relationship("User", backref="reviews")

    def __repr__(self):
        return f"<AssignmentHist {self.status} - App {self.application_fk}>"