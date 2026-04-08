from config.extensions import db


class OfficerProfile(db.Model):
    __tablename__ = "officer_profiles"

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

    # FK to collectorates.code e.g. "021"
    branch_code = db.Column(
        db.String(5),
        db.ForeignKey("collectorates.code"),
        nullable=True
    )

    work_email = db.Column(db.String(120), nullable=True)
    work_phone = db.Column(db.String(20), nullable=True)
    is_active_staff = db.Column(db.Boolean, default=True)

    branch = db.relationship(
        "Collectorate",
        foreign_keys=[branch_code]
    )

    def __repr__(self):
        return f"<OfficerProfile {self.firstname} {self.lastname}>"