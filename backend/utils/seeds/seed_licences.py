from config.extensions import db
from models.licence_record import LicenceRecord
from datetime import date


def seed_licences():
    licence_records = [
        # ── Marcus Campbell — Class B — EXPIRED Mar 2026 ─────────────────
        # First issued 2011, last renewed 2021 → expired Mar 2026
        # Can renew now (expired 33 days ago)
        {
            "trn": "123456789", "control_number": "1234567890",
            "firstname": "Marcus", "lastname": "Campbell",
            "date_of_birth": date(1990, 3, 15), "sex": "M",
            "licence_class": "B",
            "first_issue_date": date(2011, 3, 15),
            "issue_date": date(2021, 3, 15),
            "expiry_date": date(2026, 3, 15),
            "status": "EXPIRED",
            "collectorate": "021 ST. ANDREW (CONSTANT SPRING)",
            "nationality": "Jamaican", "place_of_birth": "Kingston",
            "occupation": "Software Engineer",
            "address_line1": "14 Constant Spring Road", "address_line2": "Kingston 8",
            "parish": "ST. ANDREW",
        },
        # ── Janet Reid — Class B — ACTIVE expires Jun 2026 ───────────────
        # First issued 2008, last renewed 2021 → expires Jun 2026
        # Can renew now (63 days away)
        # Also used for REPLACEMENT (LOST) past application test
        {
            "trn": "987654321", "control_number": "0987654321",
            "firstname": "Janet", "lastname": "Reid",
            "date_of_birth": date(1985, 7, 22), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2008, 7, 22),
            "issue_date": date(2021, 6, 20),
            "expiry_date": date(2026, 6, 20),
            "status": "ACTIVE",
            "collectorate": "081 ST. JAMES (MONTEGO BAY)",
            "nationality": "Jamaican", "place_of_birth": "Montego Bay",
            "occupation": "Teacher",
            "address_line1": "5 Fairview Avenue", "address_line2": "",
            "parish": "ST. JAMES",
        },
        # ── Trevor Brown — Class C — ACTIVE expires Nov 2028 ─────────────
        # First issued 2004, last renewed 2023 → expires Nov 2028
        # Cannot renew yet. Use for AMENDMENT testing
        {
            "trn": "456789123", "control_number": "4567891230",
            "firstname": "Trevor", "lastname": "Brown",
            "date_of_birth": date(1978, 11, 5), "sex": "M",
            "licence_class": "C",
            "first_issue_date": date(2004, 11, 5),
            "issue_date": date(2023, 11, 5),
            "expiry_date": date(2028, 11, 5),
            "status": "ACTIVE",
            "collectorate": "141 ST. CATHERINE (SPANISH TOWN)",
            "nationality": "Jamaican", "place_of_birth": "Spanish Town",
            "occupation": "Driver",
            "address_line1": "22 Burke Road", "address_line2": "Portmore",
            "parish": "ST. CATHERINE",
        },
        # ── Sandra Williams — Class B — EXPIRED May 2025 ─────────────────
        # First issued 2015, last renewed 2020 → expired May 2025
        # Can renew now (expired 322 days ago, within 1 year)
        {
            "trn": "321654987", "control_number": "3216549870",
            "firstname": "Sandra", "lastname": "Williams",
            "date_of_birth": date(1992, 5, 30), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2015, 5, 30),
            "issue_date": date(2020, 5, 30),
            "expiry_date": date(2025, 5, 30),
            "status": "EXPIRED",
            "collectorate": "022 ST. ANDREW (CROSS ROADS)",
            "nationality": "Jamaican", "place_of_birth": "Kingston",
            "occupation": "Nurse",
            "address_line1": "8 Dunrobin Avenue", "address_line2": "Kingston 10",
            "parish": "ST. ANDREW",
        },
        # ── Keisha Thompson — Class B — ACTIVE expires Apr 2026 ──────────
        # First issued 2010, last renewed 2021 → expires Apr 26 2026
        # Can renew now (9 days away)
        {
            "trn": "789123456", "control_number": "7891234560",
            "firstname": "Keisha", "lastname": "Thompson",
            "date_of_birth": date(1988, 4, 26), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2010, 4, 26),
            "issue_date": date(2021, 4, 26),
            "expiry_date": date(2026, 4, 26),
            "status": "ACTIVE",
            "collectorate": "021 ST. ANDREW (CONSTANT SPRING)",
            "nationality": "Jamaican", "place_of_birth": "Kingston",
            "occupation": "Accountant",
            "address_line1": "3 Barbican Road", "address_line2": "Kingston 6",
            "parish": "ST. ANDREW",
        },
        # ── Andre Morgan — Class C — ACTIVE expires May 2026 ─────────────
        # First issued 2011, last renewed 2021 → expires May 12 2026
        # Can renew now (25 days away). $7,200 Class C fee
        {
            "trn": "111222333", "control_number": "1112223330",
            "firstname": "Andre", "lastname": "Morgan",
            "date_of_birth": date(1982, 8, 12), "sex": "M",
            "licence_class": "C",
            "first_issue_date": date(2011, 8, 12),
            "issue_date": date(2021, 8, 12),
            "expiry_date": date(2026, 5, 12),
            "status": "ACTIVE",
            "collectorate": "021 ST. ANDREW (CONSTANT SPRING)",
            "nationality": "Jamaican", "place_of_birth": "Kingston",
            "occupation": "Taxi Driver",
            "address_line1": "7 Mona Road", "address_line2": "Kingston 7",
            "parish": "ST. ANDREW",
        },
        # ── Natalie Gordon — Class B — ACTIVE expires Feb 2028 ───────────
        # First issued 2012, last renewed 2023 → expires Feb 2028
        # Cannot renew yet. Use for REPLACEMENT (DAMAGED) testing
        {
            "trn": "444555666", "control_number": "4445556660",
            "firstname": "Natalie", "lastname": "Gordon",
            "date_of_birth": date(1991, 2, 28), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2012, 2, 28),
            "issue_date": date(2023, 2, 28),
            "expiry_date": date(2028, 2, 28),
            "status": "ACTIVE",
            "collectorate": "081 ST. JAMES (MONTEGO BAY)",
            "nationality": "Jamaican", "place_of_birth": "Montego Bay",
            "occupation": "Nurse",
            "address_line1": "3 Sunset Boulevard", "address_line2": "",
            "parish": "ST. JAMES",
        },
        # ── Rohan Bennett — Class C — EXPIRED Jun 2024 ───────────────────
        # First issued 2007, last renewed 2019 → expired Jun 2024
        # Expired >1yr — can ONLY do replacement (lost), not renewal
        # Fee = $3,000 ITA + $7,200 renewal = $10,200
        {
            "trn": "777888999", "control_number": "7778889990",
            "firstname": "Rohan", "lastname": "Bennett",
            "date_of_birth": date(1987, 6, 19), "sex": "M",
            "licence_class": "C",
            "first_issue_date": date(2007, 6, 19),
            "issue_date": date(2019, 6, 19),
            "expiry_date": date(2024, 6, 19),
            "status": "EXPIRED",
            "collectorate": "141 ST. CATHERINE (SPANISH TOWN)",
            "nationality": "Jamaican", "place_of_birth": "Spanish Town",
            "occupation": "Truck Driver",
            "address_line1": "12 Gregory Park", "address_line2": "Portmore",
            "parish": "ST. CATHERINE",
        },
        # ── Shelly-Ann Clarke — Class B — ACTIVE expires Sep 2027 ────────
        # First issued 2016, last renewed 2022 → expires Sep 2027
        # Cannot renew yet. Use for AMENDMENT testing
        {
            "trn": "222333444", "control_number": "2223334440",
            "firstname": "Shelly-Ann", "lastname": "Clarke",
            "date_of_birth": date(1994, 9, 3), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2016, 9, 3),
            "issue_date": date(2022, 9, 3),
            "expiry_date": date(2027, 9, 3),
            "status": "ACTIVE",
            "collectorate": "131 CLARENDON (MAY PEN)",
            "nationality": "Jamaican", "place_of_birth": "May Pen",
            "occupation": "Civil Servant",
            "address_line1": "45 Windsor Avenue", "address_line2": "",
            "parish": "CLARENDON",
        },
        # ── Omar Wright — Class B — ACTIVE expires May 2026 ──────────────
        # First issued 2011, last renewed 2021 → expires May 25 2026
        # Can renew now (38 days away)
        {
            "trn": "555666777", "control_number": "5556667770",
            "firstname": "Omar", "lastname": "Wright",
            "date_of_birth": date(1989, 12, 10), "sex": "M",
            "licence_class": "B",
            "first_issue_date": date(2011, 12, 10),
            "issue_date": date(2021, 5, 25),
            "expiry_date": date(2026, 5, 25),
            "status": "ACTIVE",
            "collectorate": "011 KINGSTON (KING STREET)",
            "nationality": "Jamaican", "place_of_birth": "Kingston",
            "occupation": "Entrepreneur",
            "address_line1": "18 Hope Road", "address_line2": "Kingston 10",
            "parish": "KINGSTON",
        },
        # ── Dionne Francis — Class B — EXPIRED Oct 2025 ──────────────────
        # First issued 2009, last renewed 2019 → issued 2019, renewed again 2020 → expires Oct 2025
        # Can renew now (expired 182 days ago). Used for REJECTED test
        {
            "trn": "888999000", "control_number": "8889990000",
            "firstname": "Dionne", "lastname": "Francis",
            "date_of_birth": date(1983, 1, 17), "sex": "F",
            "licence_class": "B",
            "first_issue_date": date(2009, 1, 17),
            "issue_date": date(2020, 10, 17),
            "expiry_date": date(2025, 10, 17),
            "status": "EXPIRED",
            "collectorate": "101 WESTMORELAND (SAVANNA-LA-MAR)",
            "nationality": "Jamaican", "place_of_birth": "Savanna-la-Mar",
            "occupation": "Business Owner",
            "address_line1": "2 Great George Street", "address_line2": "",
            "parish": "WESTMORELAND",
        },
    ]

    with db.session.no_autoflush:
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
    print("   Marcus    TRN:123456789 — EXPIRED  Mar 15 2026 — Class B — CAN RENEW")
    print("   Janet     TRN:987654321 — ACTIVE   Jun 20 2026 — Class B — CAN RENEW (63 days)")
    print("   Trevor    TRN:456789123 — ACTIVE   Nov  5 2028 — Class C — AMENDMENT only")
    print("   Sandra    TRN:321654987 — EXPIRED  May 30 2025 — Class B — CAN RENEW")
    print("   Keisha    TRN:789123456 — ACTIVE   Apr 26 2026 — Class B — CAN RENEW (9 days)")
    print("   Andre     TRN:111222333 — ACTIVE   May 12 2026 — Class C — CAN RENEW (25 days) $7,200")
    print("   Natalie   TRN:444555666 — ACTIVE   Feb 28 2028 — Class B — REPLACEMENT only")
    print("   Rohan     TRN:777888999 — EXPIRED  Jun 19 2024 — Class C — REPLACEMENT only (>1yr)")
    print("   Shelly-Ann TRN:222333444 — ACTIVE  Sep  3 2027 — Class B — AMENDMENT only")
    print("   Omar      TRN:555666777 — ACTIVE   May 25 2026 — Class B — CAN RENEW (38 days)")
    print("   Dionne    TRN:888999000 — EXPIRED  Oct 17 2025 — Class B — CAN RENEW")