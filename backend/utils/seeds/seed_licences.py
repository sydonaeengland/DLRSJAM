from config.extensions import db
from models.licence_record import LicenceRecord
from datetime import date


def seed_licences():
    licence_records = [
        {
            # Marcus — EXPIRED — Renewal demo
            # DOB: Mar 15 — expired on birthday Mar 15 2026 (24 days ago)
            "trn": "123456789",
            "control_number": "1234567890",
            "firstname": "Marcus",
            "lastname": "Campbell",
            "date_of_birth": date(1990, 3, 15),
            "sex": "M",
            "licence_class": "B",
            "issue_date": date(2021, 3, 15),
            "first_issue_date": date(2011, 3, 15),
            "expiry_date": date(2026, 3, 15),
            "status": "EXPIRED",
            "collectorate": "021 ST. ANDREW (CONSTANT SPRING)",
            "nationality": "Jamaican",
            "place_of_birth": "Kingston",
            "occupation": "Software Engineer",
            "address_line1": "14 Constant Spring Road",
            "address_line2": "Kingston 8",
            "parish": "ST. ANDREW",
        },
        {
            # Janet — ACTIVE — Replacement demo
            # DOB: Jul 22 — expires birthday Jul 22 2028
            "trn": "987654321",
            "control_number": "0987654321",
            "firstname": "Janet",
            "lastname": "Reid",
            "date_of_birth": date(1985, 7, 22),
            "sex": "F",
            "licence_class": "B",
            "issue_date": date(2023, 7, 22),
            "first_issue_date": date(2008, 7, 22),
            "expiry_date": date(2028, 7, 22),
            "status": "ACTIVE",
            "collectorate": "081 ST. JAMES (MONTEGO BAY)",
            "nationality": "Jamaican",
            "place_of_birth": "Montego Bay",
            "occupation": "Teacher",
            "address_line1": "5 Fairview Avenue",
            "address_line2": "",
            "parish": "ST. JAMES",
        },
        {
            # Trevor — ACTIVE — Amendment demo
            # DOB: Nov 5 — expires birthday Nov 5 2028
            "trn": "456789123",
            "control_number": "4567891230",
            "firstname": "Trevor",
            "lastname": "Brown",
            "date_of_birth": date(1978, 11, 5),
            "sex": "M",
            "licence_class": "C",
            "issue_date": date(2023, 11, 5),
            "first_issue_date": date(2004, 11, 5),
            "expiry_date": date(2028, 11, 5),
            "status": "ACTIVE",
            "collectorate": "141 ST. CATHERINE (SPANISH TOWN)",
            "nationality": "Jamaican",
            "place_of_birth": "Spanish Town",
            "occupation": "Driver",
            "address_line1": "22 Burke Road",
            "address_line2": "Portmore",
            "parish": "ST. CATHERINE",
        },
        {
            # Sandra — EXPIRED — long overdue renewal
            # DOB: May 30 — expired birthday May 30 2025 (10 months ago)
            "trn": "321654987",
            "control_number": "3216549870",
            "firstname": "Sandra",
            "lastname": "Williams",
            "date_of_birth": date(1992, 5, 30),
            "sex": "F",
            "licence_class": "B",
            "issue_date": date(2020, 5, 30),
            "first_issue_date": date(2015, 5, 30),
            "expiry_date": date(2025, 5, 30),
            "status": "EXPIRED",
            "collectorate": "022 ST. ANDREW (CROSS ROADS)",
            "nationality": "Jamaican",
            "place_of_birth": "Kingston",
            "occupation": "Nurse",
            "address_line1": "8 Dunrobin Avenue",
            "address_line2": "Kingston 10",
            "parish": "ST. ANDREW",
        },
        {
            # Damion — ACTIVE — expiring in 54 days (cannot renew yet)
            # DOB: Jun 1 — expires birthday Jun 1 2026
            "trn": "654321098",
            "control_number": "6543210980",
            "firstname": "Damion",
            "lastname": "Clarke",
            "date_of_birth": date(1995, 6, 1),
            "sex": "M",
            "licence_class": "B",
            "issue_date": date(2021, 6, 1),
            "first_issue_date": date(2021, 6, 1),
            "expiry_date": date(2026, 6, 1),
            "status": "ACTIVE",
            "collectorate": "131 CLARENDON (MAY PEN)",
            "nationality": "Jamaican",
            "place_of_birth": "May Pen",
            "occupation": "Mechanic",
            "address_line1": "15 Windsor Avenue",
            "address_line2": "",
            "parish": "CLARENDON",
        },
        {
            # Keisha — ACTIVE — expiring in 18 days (CAN renew now)
            # DOB: Apr 26 — expires birthday Apr 26 2026
            # Good for "expiring soon" renewal demo
            "trn": "789123456",
            "control_number": "7891234560",
            "firstname": "Keisha",
            "lastname": "Thompson",
            "date_of_birth": date(1988, 4, 26),
            "sex": "F",
            "licence_class": "B",
            "issue_date": date(2021, 4, 26),
            "first_issue_date": date(2010, 4, 26),
            "expiry_date": date(2026, 4, 26),
            "status": "ACTIVE",
            "collectorate": "021 ST. ANDREW (CONSTANT SPRING)",
            "nationality": "Jamaican",
            "place_of_birth": "Kingston",
            "occupation": "Accountant",
            "address_line1": "3 Barbican Road",
            "address_line2": "Kingston 6",
            "parish": "ST. ANDREW",
        },
    ]

    for lr in licence_records:
        if not LicenceRecord.query.filter_by(trn=lr["trn"]).first():
            db.session.add(LicenceRecord(
                trn=lr["trn"],
                control_number=lr["control_number"],
                firstname=lr["firstname"],
                lastname=lr["lastname"],
                date_of_birth=lr["date_of_birth"],
                sex=lr["sex"],
                licence_class=lr["licence_class"],
                issue_date=lr["issue_date"],
                first_issue_date=lr["first_issue_date"],
                expiry_date=lr["expiry_date"],
                status=lr["status"],
                collectorate=lr["collectorate"],
                nationality=lr["nationality"],
                place_of_birth=lr["place_of_birth"],
                occupation=lr["occupation"],
                address_line1=lr["address_line1"],
                address_line2=lr["address_line2"],
                parish=lr["parish"],
                user_id_fk=None
            ))

    db.session.commit()
    print("✅ Licence records seeded.")
    print("   Marcus  TRN:123456789 / Control:1234567890 — EXPIRED  Mar 15 2026")
    print("   Janet   TRN:987654321 / Control:0987654321 — ACTIVE   Jul 22 2028")
    print("   Trevor  TRN:456789123 / Control:4567891230 — ACTIVE   Nov  5 2028")
    print("   Sandra  TRN:321654987 / Control:3216549870 — EXPIRED  May 30 2025")
    print("   Damion  TRN:654321098 / Control:6543210980 — ACTIVE   Jun  1 2026 (too early)")
    print("   Keisha  TRN:789123456 / Control:7891234560 — ACTIVE   Apr 26 2026 (renew now)")