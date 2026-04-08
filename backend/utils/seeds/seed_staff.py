from config.extensions import db
from models.user import User
from models.role import Role
from models.user_role import User_role
from models.officer_profile import OfficerProfile
from models.supervisor_profile import SupervisorProfile
from werkzeug.security import generate_password_hash


def seed_staff():
    admin_role      = Role.query.filter_by(name="admin").first()
    officer_role    = Role.query.filter_by(name="officer").first()
    supervisor_role = Role.query.filter_by(name="supervisor").first()

    # Admin
    if not User.query.filter_by(email="admin@taj.gov.jm").first():
        admin = User(
            email="admin@taj.gov.jm",
            password_hash=generate_password_hash("Admin@1234"),
            is_active=True
        )
        db.session.add(admin)
        db.session.flush()
        db.session.add(User_role(user_id=admin.id, role_id=admin_role.id))

    # Officers
    officers = [
        {
            "email": "k.brown@taj.gov.jm",
            "firstname": "Karen",
            "lastname": "Brown",
            "staff_id": "TAJ-OFF-001",
            "branch_code": "021",
            "work_email": "k.brown@taj.gov.jm",
            "work_phone": "(876) 969-0000",
        },
        {
            "email": "d.morgan@taj.gov.jm",
            "firstname": "Devon",
            "lastname": "Morgan",
            "staff_id": "TAJ-OFF-002",
            "branch_code": "022",
            "work_email": "d.morgan@taj.gov.jm",
            "work_phone": "(876) 960-0097",
        },
        {
            "email": "s.williams@taj.gov.jm",
            "firstname": "Stacy",
            "lastname": "Williams",
            "staff_id": "TAJ-OFF-003",
            "branch_code": "081",
            "work_email": "s.williams@taj.gov.jm",
            "work_phone": "(876) 952-0000",
        },
    ]

    for o in officers:
        if not User.query.filter_by(email=o["email"]).first():
            user = User(
                email=o["email"],
                password_hash=generate_password_hash("Officer@1234"),
                is_active=True
            )
            db.session.add(user)
            db.session.flush()
            db.session.add(User_role(user_id=user.id, role_id=officer_role.id))
            db.session.add(OfficerProfile(
                user_id_fk=user.id,
                firstname=o["firstname"],
                lastname=o["lastname"],
                staff_id=o["staff_id"],
                department="Driver's Licence Unit",
                branch_code=o["branch_code"],
                work_email=o["work_email"],
                work_phone=o["work_phone"],
                is_active_staff=True
            ))

    # Supervisors
    supervisors = [
        {
            "email": "m.taylor@taj.gov.jm",
            "firstname": "Michael",
            "lastname": "Taylor",
            "staff_id": "TAJ-SUP-001",
            "branch_code": "021",
            "work_email": "m.taylor@taj.gov.jm",
            "work_phone": "(876) 969-0000",
        },
    ]

    for s in supervisors:
        if not User.query.filter_by(email=s["email"]).first():
            user = User(
                email=s["email"],
                password_hash=generate_password_hash("Super@1234"),
                is_active=True
            )
            db.session.add(user)
            db.session.flush()
            db.session.add(User_role(user_id=user.id, role_id=supervisor_role.id))
            db.session.add(SupervisorProfile(
                user_id_fk=user.id,
                firstname=s["firstname"],
                lastname=s["lastname"],
                staff_id=s["staff_id"],
                department="Driver's Licence Unit",
                branch_code=s["branch_code"],
                work_email=s["work_email"],
                work_phone=s["work_phone"],
                is_active_staff=True
            ))

    db.session.commit()
    print("✅ Staff seeded.")
    print("   admin@taj.gov.jm / Admin@1234")
    print("   k.brown@taj.gov.jm / Officer@1234")
    print("   d.morgan@taj.gov.jm / Officer@1234")
    print("   s.williams@taj.gov.jm / Officer@1234")
    print("   m.taylor@taj.gov.jm / Super@1234")