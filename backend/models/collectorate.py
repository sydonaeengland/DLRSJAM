from config.extensions import db


class Collectorate(db.Model):
    __tablename__ = "collectorates"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(5), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    full = db.Column(db.String(110), nullable=False)
    parish = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    hours = db.Column(db.String(150), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<Collectorate {self.full}>"