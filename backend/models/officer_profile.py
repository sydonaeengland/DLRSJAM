from datetime import date
from config.extensions import db

class OfficerProfile(db.Model):
    __tablename__ = "officer_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id_fk = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    staff_id = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=True)
    is_active_staff = db.Column(db.Boolean, default=True)
    
    def __init__(self,user_id_fk,firstname,lastname,staff_id,department,is_active_staff):
        self.user_id_fk = user_id_fk
        self.firstname = firstname
        self.lastname = lastname
        self.staff_id = staff_id
        self.department = department
        self.is_active_staff = is_active_staff
        
        
        
        