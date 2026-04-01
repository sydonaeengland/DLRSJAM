from config.extensions import db


class SupervisorProfile(db.Model):
    __tablename__ = "supervisor_profiles"

    id = db.Column(db.Integer, primary_key=True)

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    staff_id = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=True)
    branch = db.Column(db.String(100), nullable=True)

    work_email = db.Column(db.String(120), nullable=True)
    work_phone = db.Column(db.String(20), nullable=True)

    is_active_staff = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<SupervisorProfile {self.firstname} {self.lastname}>"
