from datetime import date
from config.extensions import db

class Profile(db.Model):
    __tablename__ = "profile"
    
    id = db.Column(db.Integer,primary_key=True)
    user_id_fk = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50),nullable=False)
    nat_id = db.Column(db.String(50),unique=True, nullable=True)
    address = db.Column(db.String(80))
    sex = db.Column(db.String(10))
    race = db.Column(db.String(30))
    date_of_birth = db.Column(db.Date, nullable=True)
    photo = db.Column(db.String(255))
        
    def get_id(self):
        try:
            return unicode(self.id)  # python 2 support
        except NameError:
            return str(self.id)  # python 3 support