from datetime import datetime,timezone
from config.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    roles = db.relationship("Role", secondary="user_roles", back_populates="users")
    profile = db.relationship("Profile", backref="user", uselist=False, lazy=True)
    officerprofile = db.relationship("OfficerProfile", backref="user", uselist=False, lazy=True)
    applications = db.relationship("Application", back_populates="applicant", lazy=True)

    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)
    
    def is_citizen(self):  return self.has_role("citizen")
    def is_officer(self):  return self.has_role("officer")
    def is_admin(self):    return self.has_role("admin")

    def __repr__(self):
        return f"<User {self.email}>"