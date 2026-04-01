from config.extensions import db


class Profile(db.Model):
    __tablename__ = "profile"

    id = db.Column(db.Integer, primary_key=True)

    user_id_fk = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    nat_id = db.Column(db.String(50), unique=True, nullable=True)

    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)

    address_line1 = db.Column(db.String(100), nullable=True)
    address_line2 = db.Column(db.String(100), nullable=True)
    parish = db.Column(db.String(50), nullable=True)

    sex = db.Column(db.String(10), nullable=True)
    photo = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<Profile {self.firstname} {self.lastname}>"