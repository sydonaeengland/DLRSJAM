from datetime import datetime, timezone
from config.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    roles = db.relationship(
        "Role",
        secondary="user_roles",
        back_populates="users"
    )

    profile = db.relationship(
        "Profile",
        backref="user",
        uselist=False,
        lazy=True
    )

    officerprofile = db.relationship(
        "OfficerProfile",
        backref="user",
        uselist=False,
        lazy=True
    )

    supervisorprofile = db.relationship(
        "SupervisorProfile",
        backref="user",
        uselist=False,
        lazy=True
    )

    # Licence record — only for applicants
    # NULL for officers, supervisors and admin
    licence_record = db.relationship(
        "LicenceRecord",
        back_populates="user",
        uselist=False,
        lazy=True
    )

    applications = db.relationship(
        "Application",
        foreign_keys="Application.user_id_fk",
        back_populates="applicant",
        lazy=True
    )

    assigned_applications = db.relationship(
        "Application",
        foreign_keys="Application.assigned_officer_id",
        back_populates="assigned_officer",
        lazy=True
    )

    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)

    def is_citizen(self):     return self.has_role("applicant")
    def is_officer(self):     return self.has_role("officer")
    def is_supervisor(self):  return self.has_role("supervisor")
    def is_admin(self):       return self.has_role("admin")

    def __repr__(self):
        return f"<User {self.email}>"