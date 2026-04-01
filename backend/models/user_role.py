from config.extensions import db


class User_role(db.Model):
    __tablename__ = "user_roles"

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        primary_key=True
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.id"),
        primary_key=True
    )

    def __init__(self, user_id, role_id):
        self.user_id = user_id
        self.role_id = role_id