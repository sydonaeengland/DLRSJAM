from config.extensions import db
from models.user import User
from models.role import Role
from models.user_role import User_role
from models.applicant_profile import Profile
from models.licence_record import LicenceRecord
from werkzeug.security import generate_password_hash


def seed_applicants():
    with db.session.no_autoflush:
        applicant_role = Role.query.filter_by(name="applicant").first()

        applicants = [
            {
                "email": "marcus.campbell@email.com",
                "password": "Marcus@1234",
                "trn": "123456789",
                "phone": "(876) 876-1234",
            },
            {
                "email": "janet.reid@email.com",
                "password": "Janet@1234",
                "trn": "987654321",
                "phone": "(876) 876-5678",
            },
            {
                "email": "trevor.brown@email.com",
                "password": "Trevor@1234",
                "trn": "456789123",
                "phone": "(876) 876-9012",
            },
            {
                "email": "sandra.williams@email.com",
                "password": "Sandra@1234",
                "trn": "321654987",
                "phone": "(876) 876-3456",
            },
            {
                "email": "keisha.thompson@email.com",
                "password": "Keisha@1234",
                "trn": "789123456",
                "phone": "(876) 876-7890",
            },
        ]

        for a in applicants:
            if User.query.filter_by(email=a["email"]).first():
                continue

            licence = LicenceRecord.query.filter_by(trn=a["trn"]).first()
            if not licence:
                print(f"   ⚠️  Licence not found for TRN {a['trn']} — skipping")
                continue

            user = User(
                email=a["email"],
                password_hash=generate_password_hash(a["password"]),
                is_active=True
            )
            db.session.add(user)
            db.session.flush()

            db.session.add(User_role(
                user_id=user.id,
                role_id=applicant_role.id
            ))

            db.session.add(Profile(
                user_id_fk=user.id,
                firstname=licence.firstname,
                lastname=licence.lastname,
                date_of_birth=licence.date_of_birth,
                nat_id=licence.trn,
                phone=a["phone"],
                email=a["email"],
                occupation=licence.occupation,
                address_line1=licence.address_line1,
                address_line2=licence.address_line2,
                parish=licence.parish,
                sex=licence.sex,
                photo=None
            ))

            licence.user_id_fk = user.id

    db.session.commit()
    print("✅ Applicant accounts seeded.")
    print("   marcus.campbell@email.com  / Marcus@1234")
    print("   janet.reid@email.com       / Janet@1234")
    print("   trevor.brown@email.com     / Trevor@1234")
    print("   sandra.williams@email.com  / Sandra@1234")
    print("   keisha.thompson@email.com  / Keisha@1234")