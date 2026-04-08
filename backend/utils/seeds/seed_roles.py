from config.extensions import db
from models.role import Role


def seed_roles():
    with db.session.no_autoflush:
        for name in ["applicant", "officer", "supervisor", "admin"]:
            if not Role.query.filter_by(name=name).first():
                db.session.add(Role(name=name))
    db.session.commit()
    print("✅ Roles seeded.")