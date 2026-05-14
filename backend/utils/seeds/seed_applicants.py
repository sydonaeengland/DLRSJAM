# Creates seed applicant user accounts linked to the seed licence records.
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
            # Original 5
            {"email": "marcus.campbell@email.com",  "password": "Marcus@1234",  "trn": "123456789", "phone": "(876) 876-1234"},
            {"email": "janet.reid@email.com",       "password": "Janet@1234",   "trn": "987654321", "phone": "(876) 876-5678"},
            {"email": "trevor.brown@email.com",     "password": "Trevor@1234",  "trn": "456789123", "phone": "(876) 876-9012"},
            {"email": "sandra.williams@email.com",  "password": "Sandra@1234",  "trn": "321654987", "phone": "(876) 876-3456"},
            # keisha.thompson excluded — kept unregistered for live demo registration
            # New 6
            {"email": "andre.morgan@email.com",     "password": "Andre@1234",   "trn": "111222333", "phone": "(876) 877-1111"},
            {"email": "natalie.gordon@email.com",   "password": "Natalie@1234", "trn": "444555666", "phone": "(876) 877-2222"},
            {"email": "rohan.bennett@email.com",    "password": "Rohan@1234",   "trn": "777888999", "phone": "(876) 877-3333"},
            {"email": "shellyann.clarke@email.com", "password": "Shelly@1234",  "trn": "222333444", "phone": "(876) 877-4444"},
            {"email": "omar.wright@email.com",      "password": "Omar@1234",    "trn": "555666777", "phone": "(876) 877-5555"},
            {"email": "dionne.francis@email.com",   "password": "Dionne@1234",  "trn": "888999000", "phone": "(876) 877-6666"},
            # New applicants for supervisor queue demo
            {"email": "devon.clarke@email.com",     "password": "Devon@1234",   "trn": "334455667", "phone": "(876) 878-1111"},
            {"email": "petra.johnson@email.com",    "password": "Petra@1234",   "trn": "556677889", "phone": "(876) 878-2222"},
            {"email": "curtis.brown@email.com",     "password": "Curtis@1234",  "trn": "667788990", "phone": "(876) 878-3333"},
            {"email": "sonia.richards@email.com",   "password": "Sonia@1234",   "trn": "778899001", "phone": "(876) 878-4444"},
        ]

        for a in applicants:
            licence = LicenceRecord.query.filter_by(trn=a["trn"]).first()
            if not licence:
                print(f"   Licence not found for TRN {a['trn']} -- skipping")
                continue

            existing_user = User.query.filter_by(email=a["email"]).first()
            if existing_user:
                existing_user.password_hash = generate_password_hash(a["password"])
                # Update profile with latest licence data
                profile = Profile.query.filter_by(user_id_fk=existing_user.id).first()
                if profile:
                    profile.firstname    = licence.firstname
                    profile.lastname     = licence.lastname
                    profile.date_of_birth = licence.date_of_birth
                    profile.nat_id       = licence.trn
                    profile.phone        = a["phone"]
                    profile.email        = a["email"]
                    profile.occupation   = licence.occupation
                    profile.address_line1 = licence.address_line1
                    profile.address_line2 = licence.address_line2
                    profile.parish       = licence.parish
                    profile.sex          = licence.sex
                licence.user_id_fk = existing_user.id
                continue

            user = User(
                email=a["email"],
                password_hash=generate_password_hash(a["password"]),
                is_active=True
            )
            db.session.add(user)
            db.session.flush()

            db.session.add(User_role(user_id=user.id, role_id=applicant_role.id))

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
    print("Applicant accounts seeded.")
    print("   marcus.campbell@email.com   / Marcus@1234   (EXPIRED — renewal)")
    print("   janet.reid@email.com        / Janet@1234    (ACTIVE — lost replacement)")
    print("   trevor.brown@email.com      / Trevor@1234   (ACTIVE — amendment, Class C)")
    print("   sandra.williams@email.com   / Sandra@1234   (EXPIRED — renewal)")
    print("   keisha.thompson@email.com   / Keisha@1234   (EXPIRED — renewal)")
    print("   andre.morgan@email.com      / Andre@1234    (ACTIVE — Class C renewal)")
    print("   natalie.gordon@email.com    / Natalie@1234  (ACTIVE — replacement, escalated)")
    print("   rohan.bennett@email.com     / Rohan@1234    (ACTIVE — lost replacement, Class C, PENDING_ITA)")
    print("   shellyann.clarke@email.com  / Shelly@1234   (ACTIVE — amendment)")
    print("   omar.wright@email.com       / Omar@1234     (ACTIVE — renewal submitted)")
    print("   dionne.francis@email.com    / Dionne@1234   (EXPIRED — rejected)")
    print("   devon.clarke@email.com      / Devon@1234    (EXPIRED — renewal)")
    print("   petra.johnson@email.com     / Petra@1234    (ACTIVE — replacement/amendment)")
    print("   curtis.brown@email.com      / Curtis@1234   (EXPIRED — Class C renewal)")
    print("   sonia.richards@email.com    / Sonia@1234    (ACTIVE — escalated/forwarded)")