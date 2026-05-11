# Creates a full set of seed applications across different statuses, officers, and branches for development and demo.
from config.extensions import db
from models.user import User
from models.application import Application
from models.document import Document
from models.application_event import ApplicationEvent
from models.face_verification import VerificationResult
from models.notification import Notification
from models.ita_correspondence import ITACorrespondence
from models.digital_licence import DigitalLicence
from datetime import datetime, timezone, timedelta
import os
import shutil
import random
import string


def generate_app_number():
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"DL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{suffix}"


def dt(year, month, day, hour=10, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def days_ago(n, hour=10):
    return datetime.now(timezone.utc).replace(
        hour=hour, minute=0, second=0, microsecond=0
    ) - timedelta(days=n)


def seed_applications():
    from flask import current_app

    # Wipe entire uploads folder — all files are orphaned when the DB is reset
    uploads_dir = os.path.join(current_app.root_path, "uploads")
    if os.path.exists(uploads_dir):
        shutil.rmtree(uploads_dir)
    os.makedirs(uploads_dir, exist_ok=True)

    from models.payment import Payment
    Notification.query.delete()
    ITACorrespondence.query.delete()
    DigitalLicence.query.delete()
    Payment.query.delete()
    ApplicationEvent.query.delete()
    Document.query.delete()
    VerificationResult.query.delete()
    Application.query.delete()
    db.session.commit()

    # Staff
    karen    = User.query.filter_by(email="k.brown@taj.gov.jm").first()      # branch 021
    devon    = User.query.filter_by(email="d.morgan@taj.gov.jm").first()     # branch 022
    tracey   = User.query.filter_by(email="t.henry@taj.gov.jm").first()      # branch 022
    stacy    = User.query.filter_by(email="s.williams@taj.gov.jm").first()   # branch 081
    omar_off = User.query.filter_by(email="o.reid@taj.gov.jm").first()       # branch 081
    pamela   = User.query.filter_by(email="p.sinclair@taj.gov.jm").first()   # branch 121
    calvin   = User.query.filter_by(email="c.foster@taj.gov.jm").first()     # branch 121
    nicole   = User.query.filter_by(email="n.gordon@taj.gov.jm").first()     # branch 141
    andre_off= User.query.filter_by(email="a.blake@taj.gov.jm").first()      # branch 141
    lorraine = User.query.filter_by(email="l.edwards@taj.gov.jm").first()    # branch 011
    marcus_off= User.query.filter_by(email="m.watson@taj.gov.jm").first()    # branch 011

    # Applicants
    marcus  = User.query.filter_by(email="marcus.campbell@email.com").first()   # 021
    janet   = User.query.filter_by(email="janet.reid@email.com").first()        # 081
    trevor  = User.query.filter_by(email="trevor.brown@email.com").first()      # 141
    sandra  = User.query.filter_by(email="sandra.williams@email.com").first()   # 022
    keisha  = User.query.filter_by(email="keisha.thompson@email.com").first()   # 021
    andre   = User.query.filter_by(email="andre.morgan@email.com").first()      # 021
    natalie = User.query.filter_by(email="natalie.gordon@email.com").first()    # 081
    rohan   = User.query.filter_by(email="rohan.bennett@email.com").first()     # 141
    shelly  = User.query.filter_by(email="shellyann.clarke@email.com").first()  # 131
    omar    = User.query.filter_by(email="omar.wright@email.com").first()       # 011
    dionne  = User.query.filter_by(email="dionne.francis@email.com").first()    # 101
    # New applicants for supervisor queue demo
    devon_a  = User.query.filter_by(email="devon.clarke@email.com").first()    # 021
    petra    = User.query.filter_by(email="petra.johnson@email.com").first()   # 081
    curtis   = User.query.filter_by(email="curtis.brown@email.com").first()    # 121
    sonia    = User.query.filter_by(email="sonia.richards@email.com").first()  # 141

    if not marcus or not karen:
        print("   Users not found -- skipping applications seed (re-seed staff first)")
        return

    DECL = "I hereby declare that all information provided in this application is true, accurate and complete to the best of my knowledge and belief."

    # Generate placeholder images
    from utils.seeds.generate_seed_images import generate_seed_images
    from models.licence_record import LicenceRecord

    all_applicants_users = [marcus, janet, trevor, sandra, keisha, andre,
                            natalie, rohan, shelly, omar, dionne,
                            devon_a, petra, curtis, sonia]
    img_applicants = []
    for u in all_applicants_users:
        if u:
            lr = LicenceRecord.query.filter_by(user_id_fk=u.id).first()
            img_applicants.append({
                "user_id":        u.id,
                "firstname":      lr.firstname if lr else u.email,
                "lastname":       lr.lastname if lr else "",
                "trn":            lr.trn if lr else "000000000",
                "dob":            str(lr.date_of_birth) if lr else "1990-01-01",
                "expiry":         str(lr.expiry_date) if lr else "2026-01-01",
                "issue_date":     str(lr.issue_date) if lr else "2021-01-01",
                "licence_class":  lr.licence_class if lr else "C",
                "address":        lr.address_line1 if lr else "Kingston, Jamaica",
                "collectorate":   lr.collectorate if lr else "021",
                "control_number": lr.control_number if lr else "0000000000",
            })

    backend_root = current_app.root_path
    img_paths = generate_seed_images(backend_root, img_applicants)

    # Document helpers
    # doc types match the app: lowercase snake_case
    # ai_check fields reflect what the quality-check endpoint would return
    # review_status: PENDING | APPROVED | RESUBMIT_REQUIRED | REJECTED

    # filename is used as original_filename only; file_path resolves from img_paths
    def doc(doc_type, filename, review_status, user=None, ai_passed=True, ai_score=92, ai_comment="Document quality verified.", ocr_data=None):
        abs_path = img_paths.get((user.id if user else None, doc_type), f"uploads/seed/{filename}") if user else f"uploads/seed/{filename}"
        d = {
            "doc_type": doc_type,
            "file_path": abs_path,
            "original_filename": filename,
            "review_status": review_status,
            "ai_check_passed": ai_passed,
            "ai_check_score": ai_score,
            "ai_check_comment": ai_comment,
            "ocr_ran": False,
            "ocr_name": None,
            "ocr_dob": None,
            "ocr_id_number": None,
            "ocr_confidence": None,
        }
        if ocr_data:
            d.update({"ocr_ran": True, **ocr_data})
        return d

    def renewal_docs(user, review="APPROVED"):
        lr = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        name = f"{lr.firstname} {lr.lastname}" if lr else "Unknown"
        dob  = str(lr.date_of_birth) if lr else None
        trn  = lr.trn if lr else "000000000"
        ocr = {"ocr_ran": True, "ocr_name": name, "ocr_dob": dob, "ocr_id_number": trn, "ocr_confidence": 0.96}
        pending = review == "PENDING"
        nid_review = "PENDING" if pending else review
        lic_review = "PENDING" if pending else review
        return [
            doc("licence_photo",          "passport_photo.jpg",   review,     user=user, ai_passed=True,  ai_score=94, ai_comment="Photo quality is good. Face clearly visible against plain background."),
            doc("national_id_front",      "nid_front.jpg",        nid_review, user=user, ai_passed=True,  ai_score=91, ai_comment="ID document clear and readable.", ocr_data=ocr),
            doc("national_id_back",       "nid_back.jpg",         nid_review, user=user, ai_passed=True,  ai_score=90, ai_comment="ID document back clear."),
            doc("existing_licence_front", "licence_front.jpg",    lic_review, user=user, ai_passed=True,  ai_score=93, ai_comment="Licence front clear and readable."),
            doc("existing_licence_back",  "licence_back.jpg",     lic_review, user=user, ai_passed=True,  ai_score=92, ai_comment="Licence back clear and readable."),
        ]

    def replacement_docs(user, review="APPROVED", police_review=None):
        lr = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        name = f"{lr.firstname} {lr.lastname}" if lr else "Unknown"
        dob  = str(lr.date_of_birth) if lr else None
        trn  = lr.trn if lr else "000000000"
        ocr = {"ocr_ran": True, "ocr_name": name, "ocr_dob": dob, "ocr_id_number": trn, "ocr_confidence": 0.96}
        pr = police_review if police_review is not None else review
        pending = review == "PENDING"
        nid_review = "PENDING" if pending else review
        return [
            doc("licence_photo",     "passport_photo.jpg",   review,     user=user, ai_passed=True, ai_score=94, ai_comment="Photo quality is good."),
            doc("national_id_front", "nid_front.jpg",        nid_review, user=user, ai_passed=True, ai_score=91, ai_comment="ID document clear.", ocr_data=ocr),
            doc("national_id_back",  "nid_back.jpg",         nid_review, user=user, ai_passed=True, ai_score=90, ai_comment="ID document back clear."),
            doc("police_report",     "police_report.jpg",    pr,         user=user, ai_passed=True, ai_score=88, ai_comment="Police report accepted."),
        ]

    def amendment_docs(user, review="APPROVED"):
        lr = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        name = f"{lr.firstname} {lr.lastname}" if lr else "Unknown"
        dob  = str(lr.date_of_birth) if lr else None
        trn  = lr.trn if lr else "000000000"
        ocr = {"ocr_ran": True, "ocr_name": name, "ocr_dob": dob, "ocr_id_number": trn, "ocr_confidence": 0.96}
        pending = review == "PENDING"
        nid_review = "PENDING" if pending else review
        return [
            doc("licence_photo",     "passport_photo.jpg", review,     user=user, ai_passed=True, ai_score=94, ai_comment="Photo quality is good."),
            doc("national_id_front", "nid_front.jpg",      nid_review, user=user, ai_passed=True, ai_score=91, ai_comment="ID document clear.", ocr_data=ocr),
            doc("national_id_back",  "nid_back.jpg",       nid_review, user=user, ai_passed=True, ai_score=90, ai_comment="ID document back clear."),
        ]

    # Verification helper
    def verif(user, passed=True, liveness=0.94, face=0.91, verified_at=None):
        from models.licence_record import LicenceRecord
        lr = LicenceRecord.query.filter_by(user_id_fk=user.id).first()
        name = f"{lr.firstname} {lr.lastname}" if lr else "Unknown"
        dob  = lr.date_of_birth if lr else None
        trn  = lr.trn if lr else "000000000"
        return {
            "ocr_name": name,
            "ocr_dob": dob,
            "ocr_id_number": trn,
            "ocr_address": lr.address_line1 if lr else "",
            "ocr_confidence": 0.96,
            "face_match_score": face,
            "liveness_score": liveness,
            "liveness_passed": passed,
            "requires_manual_review": not passed,
            "verified_at": verified_at,
        }

    applications = [

        # ══════════════════════════════════════════════════════════════════
        # HISTORICAL — past approved applications giving applicants their
        # current licences. All old dates, all APPROVED.
        # ══════════════════════════════════════════════════════════════════

        # Marcus — historical RENEWAL 2021
        {
            "user": marcus, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 3, 8), "officer_decision_at": dt(2021, 3, 15),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_marcus_2021", "payment_confirmed_at": dt(2021, 3, 8),
            "verification": verif(marcus, verified_at=dt(2021, 3, 8, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": marcus, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": marcus, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": renewal_docs(marcus),
        },
        # Janet — historical RENEWAL 2021
        {
            "user": janet, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 6, 13), "officer_decision_at": dt(2021, 6, 20),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_janet_2021", "payment_confirmed_at": dt(2021, 6, 13),
            "verification": verif(janet, verified_at=dt(2021, 6, 13, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": janet,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": janet,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": renewal_docs(janet),
        },
        # Trevor — historical RENEWAL 2023
        {
            "user": trevor, "officer": nicole,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "141", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2023, 10, 29), "officer_decision_at": dt(2023, 11, 5),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_trevor_2023", "payment_confirmed_at": dt(2023, 10, 29),
            "verification": verif(trevor, verified_at=dt(2023, 10, 29, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": trevor, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": trevor, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": nicole, "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": nicole, "comment": "Class C renewal approved."},
            ],
            "documents": renewal_docs(trevor),
        },
        # Sandra — historical RENEWAL 2020
        {
            "user": sandra, "officer": devon,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "022", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2020, 5, 23), "officer_decision_at": dt(2020, 5, 30),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_sandra_2020", "payment_confirmed_at": dt(2020, 5, 23),
            "verification": verif(sandra, verified_at=dt(2020, 5, 23, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": sandra, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": sandra, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": devon,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": devon,  "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(sandra),
        },
        # Keisha — historical RENEWAL 2016 (gave her 2016–2021 licence)
        {
            "user": keisha, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2016, 4, 19), "officer_decision_at": dt(2016, 4, 26),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_keisha_2016", "payment_confirmed_at": dt(2016, 4, 19),
            "verification": verif(keisha, verified_at=dt(2016, 4, 19, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": keisha, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": keisha, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": renewal_docs(keisha),
        },
        # Keisha — historical RENEWAL 2021 (gave her 2021–2026 licence, now EXPIRED)
        {
            "user": keisha, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 4, 19), "officer_decision_at": dt(2021, 4, 26),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_keisha_2021", "payment_confirmed_at": dt(2021, 4, 19),
            "verification": verif(keisha, verified_at=dt(2021, 4, 19, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": keisha, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": keisha, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": renewal_docs(keisha),
        },
        # Andre — historical RENEWAL 2021
        {
            "user": andre, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 8, 5), "officer_decision_at": dt(2021, 8, 12),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_andre_2021", "payment_confirmed_at": dt(2021, 8, 5),
            "verification": verif(andre, verified_at=dt(2021, 8, 5, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": andre,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": andre,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "Class C renewal approved."},
            ],
            "documents": renewal_docs(andre),
        },
        # Natalie — historical RENEWAL 2023
        {
            "user": natalie, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2023, 2, 21), "officer_decision_at": dt(2023, 2, 28),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_natalie_2023", "payment_confirmed_at": dt(2023, 2, 21),
            "verification": verif(natalie, verified_at=dt(2023, 2, 21, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": natalie, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": natalie, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,   "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(natalie),
        },
        # Rohan — historical RENEWAL 2021
        {
            "user": rohan, "officer": nicole,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "141", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 6, 12), "officer_decision_at": dt(2021, 6, 19),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_rohan_2021", "payment_confirmed_at": dt(2021, 6, 12),
            "verification": verif(rohan, verified_at=dt(2021, 6, 12, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": rohan,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": rohan,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": nicole, "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": nicole, "comment": "Class C renewal approved."},
            ],
            "documents": renewal_docs(rohan),
        },
        # Shelly-Ann — historical RENEWAL 2022 (131 = St. Elizabeth; no officer there, use lorraine 011)
        {
            "user": shelly, "officer": lorraine,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "131", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2022, 8, 27), "officer_decision_at": dt(2022, 9, 3),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_shelly_2022", "payment_confirmed_at": dt(2022, 8, 27),
            "verification": verif(shelly, verified_at=dt(2022, 8, 27, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": shelly,   "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": shelly,   "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": lorraine, "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": lorraine, "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(shelly),
        },
        # Omar — historical RENEWAL 2021
        {
            "user": omar, "officer": lorraine,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "011", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 5, 18), "officer_decision_at": dt(2021, 5, 25),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_omar_2021", "payment_confirmed_at": dt(2021, 5, 18),
            "verification": verif(omar, verified_at=dt(2021, 5, 18, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": omar,    "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": omar,    "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": lorraine,"comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": lorraine,"comment": "Renewal approved."},
            ],
            "documents": renewal_docs(omar),
        },
        # Dionne — historical RENEWAL 2020
        {
            "user": dionne, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2020, 10, 10), "officer_decision_at": dt(2020, 10, 17),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_dionne_2020", "payment_confirmed_at": dt(2020, 10, 10),
            "verification": verif(dionne, verified_at=dt(2020, 10, 10, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": dionne,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": dionne,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,   "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(dionne),
        },

        # ══════════════════════════════════════════════════════════════════
        # CURRENT — active applications covering all transaction types
        # and all meaningful statuses across all three officers
        #
        # Karen (021): marcus SUBMITTED, andre WAITING_ON_APPLICANT,
        #              omar SUBMITTED, dionne REJECTED,
        #              shelly AMENDMENT UNDER_REVIEW
        # Devon (022): sandra RESUBMITTED, trevor AMENDMENT SUBMITTED
        # Stacy (081): janet RENEWAL UNDER_REVIEW,
        #              natalie REPLACEMENT ESCALATED,
        #              rohan REPLACEMENT PENDING_ITA,
        #              janet REPLACEMENT APPROVED (approved tab)
        #              dionne RENEWAL APPROVED (approved tab)
        # ══════════════════════════════════════════════════════════════════

        # Karen's queue (branch 021)

        # 1. Marcus — RENEWAL — SUBMITTED today
        {
            "user": marcus, "officer": karen,
            "transaction_type": "RENEWAL", "status": "SUBMITTED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(0),
            "payment_reference": "pi_curr_marcus_2026", "payment_confirmed_at": days_ago(0),
            "verification": verif(marcus, verified_at=days_ago(0, hour=9)),
            "notifications": [
                {"recipient": karen, "event_type": "SUBMITTED",
                 "message": "New renewal application submitted by Marcus Campbell."},
            ],
            "events": [
                {"event_type": "CREATED",   "from_status": None,    "to_status": "DRAFT",     "by": marcus, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED", "by": marcus, "comment": "Payment confirmed. Application submitted."},
            ],
            "documents": renewal_docs(marcus, review="PENDING"),
        },

        # 2. Andre — Class C RENEWAL — WAITING_ON_APPLICANT (blurry photo)
        {
            "user": andre, "officer": karen,
            "transaction_type": "RENEWAL", "status": "WAITING_ON_APPLICANT",
            "pickup_collectorate_code": "021", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": days_ago(5),
            "payment_reference": "pi_curr_andre_2026", "payment_confirmed_at": days_ago(5),
            "officer_comment": "Passport photo is blurry and does not meet quality standards. Please resubmit a clear, recent photo against a white background.",
            "officer_decision_at": days_ago(1),
            "verification": verif(andre, verified_at=days_ago(5, hour=9)),
            "notifications": [
                {"recipient": andre, "event_type": "RESUBMISSION_REQUESTED",
                 "message": "Your officer has requested changes to your application. Please log in to review and resubmit."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                "by": andre,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",            "by": andre,  "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",         "by": karen,  "comment": "Officer started review"},
                {"event_type": "RESUBMIT",       "from_status": "UNDER_REVIEW","to_status": "WAITING_ON_APPLICANT", "by": karen,  "comment": "Passport photo is blurry and does not meet quality standards. Please resubmit a clear, recent photo against a white background."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "RESUBMIT_REQUIRED", user=andre, ai_passed=False, ai_score=38, ai_comment="Photo is blurry. Please retake with good lighting against a plain white background."),
                doc("national_id_front",      "nid_front.jpg",       "APPROVED",          user=andre, ai_passed=True,  ai_score=91, ai_comment="ID document clear and readable."),
                doc("national_id_back",       "nid_back.jpg",        "APPROVED",          user=andre, ai_passed=True,  ai_score=90, ai_comment="ID document back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "APPROVED",          user=andre, ai_passed=True,  ai_score=93, ai_comment="Licence front clear."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",          user=andre, ai_passed=True,  ai_score=92, ai_comment="Licence back clear."),
            ],
        },

        # 3. Omar — RENEWAL — SUBMITTED yesterday
        {
            "user": omar, "officer": karen,
            "transaction_type": "RENEWAL", "status": "SUBMITTED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(1),
            "payment_reference": "pi_curr_omar_2026", "payment_confirmed_at": days_ago(1),
            "verification": verif(omar, verified_at=days_ago(1, hour=9)),
            "notifications": [
                {"recipient": karen, "event_type": "SUBMITTED",
                 "message": "New renewal application submitted by Omar Wright."},
            ],
            "events": [
                {"event_type": "CREATED",   "from_status": None,    "to_status": "DRAFT",     "by": omar,  "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED", "by": omar,  "comment": "Payment confirmed. Application submitted."},
            ],
            "documents": renewal_docs(omar, review="PENDING"),
        },

        # 4. Dionne — RENEWAL — REJECTED (name mismatch)
        {
            "user": dionne, "officer": karen,
            "transaction_type": "RENEWAL", "status": "REJECTED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(8),
            "payment_reference": "pi_curr_dionne_2026", "payment_confirmed_at": days_ago(8),
            "officer_comment": "Name on National ID does not match the licence record. Application cannot be processed. Please visit your nearest TAJ office with original documents.",
            "officer_decision_at": days_ago(3),
            "verification": verif(dionne, verified_at=days_ago(8, hour=9)),
            "notifications": [
                {"recipient": dionne, "event_type": "APPLICATION_REJECTED",
                 "message": "Your licence renewal application has been rejected. Please log in to view the reason."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": dionne, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": dionne, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "REJECTED",       "from_status": "UNDER_REVIEW","to_status": "REJECTED",     "by": karen,  "comment": "Name on National ID does not match the licence record. Application cannot be processed. Please visit your nearest TAJ office with original documents."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "APPROVED",  user=dionne, ai_passed=True,  ai_score=94, ai_comment="Photo quality is good."),
                doc("national_id_front",      "nid_front.jpg",       "REJECTED",  user=dionne, ai_passed=True,  ai_score=89, ai_comment="ID accepted by AI but rejected by officer — name mismatch.", ocr_data={"ocr_ran": True, "ocr_name": "Dionne P Francis", "ocr_dob": "1983-01-17", "ocr_id_number": "888999000", "ocr_confidence": 0.88}),
                doc("national_id_back",       "nid_back.jpg",        "REJECTED",  user=dionne, ai_passed=True,  ai_score=88, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "APPROVED",  user=dionne, ai_passed=True,  ai_score=93, ai_comment="Licence front clear."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",  user=dionne, ai_passed=True,  ai_score=92, ai_comment="Licence back clear."),
            ],
        },

        # 5. Shelly-Ann — AMENDMENT (address change) — UNDER_REVIEW by Karen
        {
            "user": shelly, "officer": karen,
            "transaction_type": "AMENDMENT", "status": "UNDER_REVIEW",
            "pickup_collectorate_code": "021", "fee_amount": 4140.00,
            "declaration": DECL,
            "submitted_at": days_ago(2),
            "payment_reference": "pi_curr_shelly_2026", "payment_confirmed_at": days_ago(2),
            "address_change_requested": True,
            "new_address_line1": "12 Constant Spring Road",
            "new_address_line2": "Kingston 8",
            "new_parish": "ST. ANDREW",
            "verification": verif(shelly, verified_at=days_ago(2, hour=9)),
            "events": [
                {"event_type": "CREATED",        "from_status": None,        "to_status": "DRAFT",        "by": shelly, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",     "to_status": "SUBMITTED",    "by": shelly, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
            ],
            "documents": amendment_docs(shelly, review="APPROVED"),
        },

        # Devon's queue (branch 022)

        # 6. Sandra — RENEWAL — RESUBMITTED (applicant responded to Devon's request)
        {
            "user": sandra, "officer": devon,
            "transaction_type": "RENEWAL", "status": "RESUBMITTED",
            "pickup_collectorate_code": "022", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(6),
            "payment_reference": "pi_curr_sandra_2026", "payment_confirmed_at": days_ago(6),
            "officer_comment": "National ID appears to be expired. Please upload a valid, current form of identification.",
            "officer_decision_at": days_ago(4),
            "verification": verif(sandra, verified_at=days_ago(6, hour=9)),
            "notifications": [
                {"recipient": devon, "event_type": "RESUBMITTED",
                 "message": "Sandra Williams has resubmitted their application with updated documents."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,                   "to_status": "DRAFT",                "by": sandra, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",                "to_status": "SUBMITTED",            "by": sandra, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",            "to_status": "UNDER_REVIEW",         "by": devon,  "comment": "Officer started review"},
                {"event_type": "RESUBMIT",       "from_status": "UNDER_REVIEW",         "to_status": "WAITING_ON_APPLICANT", "by": devon,  "comment": "National ID appears to be expired. Please upload a valid, current form of identification."},
                {"event_type": "RESUBMITTED",    "from_status": "WAITING_ON_APPLICANT", "to_status": "RESUBMITTED",          "by": sandra, "comment": "Updated National ID uploaded."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "APPROVED",  user=sandra, ai_passed=True,  ai_score=94, ai_comment="Photo quality is good."),
                doc("national_id_front",      "nid_front.jpg",       "PENDING",   user=sandra, ai_passed=True,  ai_score=91, ai_comment="ID document clear.", ocr_data={"ocr_ran": True, "ocr_name": "Sandra Williams", "ocr_dob": "1992-05-30", "ocr_id_number": "321654987", "ocr_confidence": 0.95}),
                doc("national_id_back",       "nid_back.jpg",        "PENDING",   user=sandra, ai_passed=True,  ai_score=90, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "APPROVED",  user=sandra, ai_passed=True,  ai_score=93, ai_comment="Licence front clear."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",  user=sandra, ai_passed=True,  ai_score=92, ai_comment="Licence back clear."),
            ],
        },

        # 7. Trevor — AMENDMENT (address change) — SUBMITTED to Devon
        {
            "user": trevor, "officer": devon,
            "transaction_type": "AMENDMENT", "status": "SUBMITTED",
            "pickup_collectorate_code": "022", "fee_amount": 4140.00,
            "declaration": DECL,
            "submitted_at": days_ago(1),
            "payment_reference": "pi_curr_trevor_2026", "payment_confirmed_at": days_ago(1),
            "address_change_requested": True,
            "new_address_line1": "5 Old Hope Road",
            "new_address_line2": "Kingston 6",
            "new_parish": "ST. ANDREW",
            "verification": verif(trevor, verified_at=days_ago(1, hour=9)),
            "notifications": [
                {"recipient": devon, "event_type": "SUBMITTED",
                 "message": "New amendment application submitted by Trevor Brown."},
            ],
            "events": [
                {"event_type": "CREATED",   "from_status": None,    "to_status": "DRAFT",     "by": trevor, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED", "by": trevor, "comment": "Payment confirmed. Application submitted."},
            ],
            "documents": amendment_docs(trevor, review="PENDING"),
        },

        # Stacy's queue (branch 081)

        # 8. Janet — RENEWAL — UNDER_REVIEW by Stacy
        {
            "user": janet, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "UNDER_REVIEW",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(2),
            "payment_reference": "pi_curr_janet_2026", "payment_confirmed_at": days_ago(2),
            "verification": verif(janet, verified_at=days_ago(2, hour=9)),
            "events": [
                {"event_type": "CREATED",        "from_status": None,        "to_status": "DRAFT",        "by": janet,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",     "to_status": "SUBMITTED",    "by": janet,  "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "Officer started review"},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "APPROVED",  user=janet, ai_passed=True, ai_score=94, ai_comment="Photo quality is good."),
                doc("national_id_front",      "nid_front.jpg",       "APPROVED",  user=janet, ai_passed=True, ai_score=91, ai_comment="ID document clear.", ocr_data={"ocr_ran": True, "ocr_name": "Janet Reid", "ocr_dob": "1985-07-22", "ocr_id_number": "987654321", "ocr_confidence": 0.96}),
                doc("national_id_back",       "nid_back.jpg",        "APPROVED",  user=janet, ai_passed=True, ai_score=90, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "PENDING",   user=janet, ai_passed=True, ai_score=93, ai_comment="Licence front clear."),
                doc("existing_licence_back",  "licence_back.jpg",    "PENDING",   user=janet, ai_passed=True, ai_score=92, ai_comment="Licence back clear."),
            ],
        },

        # 9. Natalie — REPLACEMENT — ESCALATED by Stacy (possible fraud)
        #    Licence is active (expires Feb 2028) — valid for replacement
        {
            "user": natalie, "officer": stacy,
            "transaction_type": "REPLACEMENT", "status": "ESCALATED",
            "pickup_collectorate_code": "081", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(7),
            "payment_reference": "pi_curr_natalie_2026", "payment_confirmed_at": days_ago(7),
            "officer_comment": "Licence damage appears intentional — edges cleanly cut. Possible fraud. Escalating for senior review.",
            "officer_decision_at": days_ago(2),
            "escalated_to_supervisor_at": days_ago(2),
            "escalation_reason": "Licence damage appears intentional — edges cleanly cut. Possible fraud.",
            "verification": verif(natalie, verified_at=days_ago(7, hour=9)),
            "notifications": [
                {"recipient": natalie, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your replacement application has been escalated for senior review. You will be notified of the outcome."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": natalie, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": natalie, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,   "comment": "Officer started review"},
                {"event_type": "ESCALATION",     "from_status": "UNDER_REVIEW","to_status": "ESCALATED",    "by": stacy,   "comment": "Licence damage appears intentional — edges cleanly cut. Possible fraud. Escalating for senior review."},
            ],
            "documents": replacement_docs(natalie, review="APPROVED", police_review="PENDING"),
        },

        # 10. Rohan — REPLACEMENT — PENDING_ITA
        #     Licence active (expires Jun 2026) — valid for replacement
        {
            "user": rohan, "officer": stacy,
            "transaction_type": "REPLACEMENT", "status": "PENDING_ITA",
            "pickup_collectorate_code": "081", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(4),
            "payment_reference": "pi_curr_rohan_2026", "payment_confirmed_at": days_ago(4),
            "ita_request_sent_at": days_ago(3),
            "verification": verif(rohan, verified_at=days_ago(4, hour=9)),
            "ita_correspondence": [
                {
                    "officer": stacy, "direction": "OUTGOING",
                    "subject": "ITA Traffic Clearance Request — Rohan Bennett",
                    "body": "Dear ITA,\n\nWe request traffic clearance for the following applicant:\n\nName: Rohan James Bennett\nTRN: 777888999\nTransaction: REPLACEMENT\n\nPlease respond at your earliest convenience.\n\nRegards,\nTAJ Officer Portal",
                    "sent_at": days_ago(3),
                },
            ],
            "events": [
                {"event_type": "CREATED",       "from_status": None,          "to_status": "DRAFT",       "by": rohan, "comment": "Application created"},
                {"event_type": "SUBMITTED",     "from_status": "DRAFT",       "to_status": "SUBMITTED",   "by": rohan, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED","from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW","by": stacy, "comment": "Officer started review"},
                {"event_type": "ITA_REQUESTED", "from_status": "UNDER_REVIEW","to_status": "PENDING_ITA", "by": stacy, "comment": "ITA clearance letter requested."},
            ],
            "documents": replacement_docs(rohan),
        },

        # 11. Janet — REPLACEMENT — APPROVED by Stacy (14 days ago)
        #     Shows in Stacy's Approved tab
        {
            "user": janet, "officer": stacy,
            "transaction_type": "REPLACEMENT", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(14),
            "payment_reference": "pi_curr_janet_repl_2026", "payment_confirmed_at": days_ago(14),
            "officer_comment": "Police report verified. ITA cleared. Replacement approved.",
            "officer_decision_at": days_ago(10),
            "ita_request_sent_at": days_ago(13),
            "ita_response_received_at": days_ago(13),
            "ita_outcome": "CLEARED",
            "ita_reference": "ITA-CLR-2026-7741",
            "verification": verif(janet, verified_at=days_ago(14, hour=9)),
            "digital_licence": True,
            "notifications": [
                {"recipient": janet, "event_type": "APPLICATION_APPROVED",
                 "message": "Your replacement application has been approved. Your digital licence is ready."},
            ],
            "ita_correspondence": [
                {
                    "officer": stacy, "direction": "OUTGOING",
                    "subject": "ITA Traffic Clearance Request — Janet Reid",
                    "body": "Dear ITA,\n\nWe request traffic clearance for the following applicant:\n\nName: Janet Marie Reid\nTRN: 987654321\nTransaction: REPLACEMENT\n\nPlease respond at your earliest convenience.\n\nRegards,\nTAJ Officer Portal",
                    "sent_at": days_ago(13),
                },
                {
                    "officer": stacy, "direction": "INCOMING",
                    "subject": "RE: ITA Traffic Clearance Request — Janet Reid",
                    "body": "Dear TAJ Officer,\n\nThis is to confirm that the above-named applicant has been cleared by the Island Traffic Authority.\n\nClearance Reference: ITA-CLR-2026-7741\nOutcome: CLEARED\n\nYou may proceed with the application.\n\nRegards,\nIsland Traffic Authority",
                    "ita_reference": "ITA-CLR-2026-7741",
                    "outcome": "CLEARED",
                    "sent_at": days_ago(13),
                },
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": janet,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": janet,  "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "Officer started review"},
                {"event_type": "ITA_REQUESTED",  "from_status": "UNDER_REVIEW","to_status": "PENDING_ITA",  "by": stacy,  "comment": "ITA clearance letter requested."},
                {"event_type": "ITA_CLEARED",    "from_status": "PENDING_ITA", "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "ITA clearance confirmed. Reference: ITA-CLR-2026-7741"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,  "comment": "Police report verified. ITA cleared. Replacement approved."},
            ],
            "documents": replacement_docs(janet),
        },

        # 12. Dionne — RENEWAL — APPROVED by Karen (9 days ago)
        #     Shows in Karen's Approved tab
        {
            "user": dionne, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(12),
            "payment_reference": "pi_curr_dionne_approved_2026", "payment_confirmed_at": days_ago(12),
            "officer_comment": "All documents verified. Renewal approved.",
            "officer_decision_at": days_ago(9),
            "verification": verif(dionne, verified_at=days_ago(12, hour=9)),
            "digital_licence": True,
            "notifications": [
                {"recipient": dionne, "event_type": "APPLICATION_APPROVED",
                 "message": "Your licence renewal application has been approved. Your digital licence is ready."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": dionne, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": dionne, "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": renewal_docs(dionne),
        },

        # ══════════════════════════════════════════════════════════════════
        # ADDITIONAL CASES — covering more branches and supervisor-facing
        # statuses: PENDING_SUPERVISOR_APPROVAL (forwarded), ESCALATED,
        # REJECTED, across branches 021, 022, 081, 121, 141, 011
        # ══════════════════════════════════════════════════════════════════

        # Historical for new applicants

        # 13. Devon Clarke — historical RENEWAL 2021 (branch 021)
        {
            "user": devon_a, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 1, 25), "officer_decision_at": dt(2021, 2, 1),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_devon_2021", "payment_confirmed_at": dt(2021, 1, 25),
            "verification": verif(devon_a, verified_at=dt(2021, 1, 25, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": devon_a, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": devon_a, "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,   "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(devon_a),
        },

        # 14. Petra Johnson — historical RENEWAL 2022 (branch 081)
        {
            "user": petra, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2022, 3, 20), "officer_decision_at": dt(2022, 3, 27),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_petra_2022", "payment_confirmed_at": dt(2022, 3, 20),
            "verification": verif(petra, verified_at=dt(2022, 3, 20, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": petra,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": petra,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,  "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(petra),
        },

        # 15. Curtis Brown — historical RENEWAL 2020 (branch 121)
        {
            "user": curtis, "officer": pamela,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "121", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2020, 12, 10), "officer_decision_at": dt(2020, 12, 17),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_curtis_2020", "payment_confirmed_at": dt(2020, 12, 10),
            "verification": verif(curtis, verified_at=dt(2020, 12, 10, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": curtis,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": curtis,  "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": pamela,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": pamela,  "comment": "Class C renewal approved."},
            ],
            "documents": renewal_docs(curtis),
        },

        # 16. Sonia Richards — historical RENEWAL 2021 (branch 141)
        {
            "user": sonia, "officer": nicole,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "141", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 9, 5), "officer_decision_at": dt(2021, 9, 12),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_sonia_2021", "payment_confirmed_at": dt(2021, 9, 5),
            "verification": verif(sonia, verified_at=dt(2021, 9, 5, 9, 30)),
            "digital_licence": True,
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": sonia,   "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": sonia,   "comment": "Payment confirmed"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": nicole,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": nicole,  "comment": "Renewal approved."},
            ],
            "documents": renewal_docs(sonia),
        },

        # 17. Sandra — RENEWAL — PENDING_SUPERVISOR_APPROVAL (forwarded by Tracey, 022)
        {
            "user": sandra, "officer": tracey,
            "transaction_type": "RENEWAL", "status": "PENDING_SUPERVISOR_APPROVAL",
            "pickup_collectorate_code": "022", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(3),
            "payment_reference": "pi_sandra_fwd_2026", "payment_confirmed_at": days_ago(3),
            "officer_comment": "Verification scores are borderline (face match 74%). Forwarding supervisor review.",
            "officer_decision_at": days_ago(0),
            "escalated_to_supervisor_at": days_ago(0),
            "verification": verif(sandra, face=0.74, verified_at=days_ago(3, hour=9)),
            "notifications": [
                {"recipient": sandra, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your renewal application has been forwarded to a supervisor for additional review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                       "by": sandra, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",                   "by": sandra, "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",                "by": tracey, "comment": "Officer started review"},
                {"event_type": "FORWARDED",      "from_status": "UNDER_REVIEW","to_status": "PENDING_SUPERVISOR_APPROVAL", "by": tracey, "comment": "Verification scores borderline. Forwarding for supervisor review."},
            ],
            "documents": renewal_docs(sandra),
        },

        # 18. Marcus — REPLACEMENT — ESCALATED by Pamela (branch 121)
        #     Pickup is 121 (Mandeville); escalated for suspected document tampering
        {
            "user": marcus, "officer": pamela,
            "transaction_type": "REPLACEMENT", "status": "ESCALATED",
            "pickup_collectorate_code": "121", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(5),
            "payment_reference": "pi_marcus_esc_2026", "payment_confirmed_at": days_ago(5),
            "officer_comment": "National ID shows signs of alteration on the date of birth field. Escalating for supervisory review.",
            "officer_decision_at": days_ago(1),
            "escalated_to_supervisor_at": days_ago(1),
            "escalation_reason": "National ID shows signs of alteration on the date of birth field. Possible document tampering.",
            "verification": verif(marcus, face=0.69, verified_at=days_ago(5, hour=9)),
            "notifications": [
                {"recipient": marcus, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your replacement application has been escalated for senior review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": marcus, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": marcus, "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": pamela, "comment": "Officer started review"},
                {"event_type": "ESCALATION",     "from_status": "UNDER_REVIEW","to_status": "ESCALATED",    "by": pamela, "comment": "National ID shows signs of alteration on the date of birth field. Possible document tampering."},
            ],
            "documents": replacement_docs(marcus, review="APPROVED"),
        },

        # 19. Rohan — RENEWAL — REJECTED by Nicole (branch 141)
        #     Pickup 141 (Spanish Town); licence class mismatch
        {
            "user": rohan, "officer": nicole,
            "transaction_type": "RENEWAL", "status": "REJECTED",
            "pickup_collectorate_code": "141", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": days_ago(6),
            "payment_reference": "pi_rohan_rej_2026", "payment_confirmed_at": days_ago(6),
            "officer_comment": "Application submitted for Class C but licence record shows Class A only. Incorrect fee paid. Application rejected — please reapply with the correct transaction.",
            "officer_decision_at": days_ago(2),
            "verification": verif(rohan, verified_at=days_ago(6, hour=9)),
            "notifications": [
                {"recipient": rohan, "event_type": "APPLICATION_REJECTED",
                 "message": "Your licence renewal application has been rejected. Please log in to view the reason."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": rohan,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": rohan,  "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": nicole, "comment": "Officer started review"},
                {"event_type": "REJECTED",       "from_status": "UNDER_REVIEW","to_status": "REJECTED",     "by": nicole, "comment": "Incorrect licence class on application. Rejected."},
            ],
            "documents": renewal_docs(rohan, review="APPROVED"),
        },

        # 20. Trevor — RENEWAL — SUBMITTED to Calvin (branch 121)
        {
            "user": trevor, "officer": calvin,
            "transaction_type": "RENEWAL", "status": "SUBMITTED",
            "pickup_collectorate_code": "121", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": days_ago(0),
            "payment_reference": "pi_trevor_sub_2026", "payment_confirmed_at": days_ago(0),
            "verification": verif(trevor, verified_at=days_ago(0, hour=9)),
            "notifications": [
                {"recipient": calvin, "event_type": "SUBMITTED",
                 "message": "New renewal application submitted by Trevor Brown."},
            ],
            "events": [
                {"event_type": "CREATED",   "from_status": None,    "to_status": "DRAFT",     "by": trevor, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED", "by": trevor, "comment": "Payment confirmed."},
            ],
            "documents": renewal_docs(trevor, review="PENDING"),
        },

        # 21. Natalie — AMENDMENT — UNDER_REVIEW by Andre_off (branch 141, Spanish Town)
        #     Occupation change request
        {
            "user": natalie, "officer": andre_off,
            "transaction_type": "AMENDMENT", "status": "UNDER_REVIEW",
            "pickup_collectorate_code": "141", "fee_amount": 4140.00,
            "declaration": DECL,
            "submitted_at": days_ago(1),
            "payment_reference": "pi_natalie_amend_2026", "payment_confirmed_at": days_ago(1),
            "new_occupation": "Software Engineer",
            "verification": verif(natalie, verified_at=days_ago(1, hour=9)),
            "events": [
                {"event_type": "CREATED",        "from_status": None,        "to_status": "DRAFT",        "by": natalie,   "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",     "to_status": "SUBMITTED",    "by": natalie,   "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW", "by": andre_off, "comment": "Officer started review"},
            ],
            "documents": amendment_docs(natalie, review="PENDING"),
        },

        # 22. Omar — REPLACEMENT — PENDING_SUPERVISOR_APPROVAL (forwarded by Lorraine, 011)
        #     Kingston branch; liveness check failed, manually reviewed
        {
            "user": omar, "officer": lorraine,
            "transaction_type": "REPLACEMENT", "status": "PENDING_SUPERVISOR_APPROVAL",
            "pickup_collectorate_code": "011", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(3),
            "payment_reference": "pi_omar_fwd_2026", "payment_confirmed_at": days_ago(3),
            "officer_comment": "Liveness check failed but manual review of documents and police report is satisfactory. Forwarding for supervisor approval.",
            "officer_decision_at": days_ago(0),
            "escalated_to_supervisor_at": days_ago(0),
            "verification": verif(omar, passed=False, liveness=0.52, face=0.88, verified_at=days_ago(3, hour=9)),
            "notifications": [
                {"recipient": omar, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your replacement application has been forwarded to a supervisor for final review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                       "by": omar,    "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",                   "by": omar,    "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",                "by": lorraine,"comment": "Officer started review — liveness check flagged for manual review"},
                {"event_type": "FORWARDED",      "from_status": "UNDER_REVIEW","to_status": "PENDING_SUPERVISOR_APPROVAL", "by": lorraine,"comment": "Liveness failed but documents satisfactory. Forwarding for approval."},
            ],
            "documents": replacement_docs(omar, review="APPROVED"),
        },

        # 23. Shelly — RENEWAL — REJECTED by Marcus_off (branch 011)
        #     Photo is a selfie, does not meet passport-style standard
        {
            "user": shelly, "officer": marcus_off,
            "transaction_type": "RENEWAL", "status": "REJECTED",
            "pickup_collectorate_code": "011", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(4),
            "payment_reference": "pi_shelly_rej_2026", "payment_confirmed_at": days_ago(4),
            "officer_comment": "Passport photo submitted is a selfie with visible background objects. Does not meet government photo ID standards. Application rejected.",
            "officer_decision_at": days_ago(1),
            "verification": verif(shelly, verified_at=days_ago(4, hour=9)),
            "notifications": [
                {"recipient": shelly, "event_type": "APPLICATION_REJECTED",
                 "message": "Your renewal application has been rejected. Please log in to view the reason."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": shelly,     "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": shelly,     "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": marcus_off, "comment": "Officer started review"},
                {"event_type": "REJECTED",       "from_status": "UNDER_REVIEW","to_status": "REJECTED",     "by": marcus_off, "comment": "Photo does not meet passport-style standards. Application rejected."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "REJECTED",  user=shelly, ai_passed=False, ai_score=31, ai_comment="Selfie detected — background not plain white. Photo rejected."),
                doc("national_id_front",      "nid_front.jpg",       "APPROVED",  user=shelly, ai_passed=True,  ai_score=91, ai_comment="ID clear."),
                doc("national_id_back",       "nid_back.jpg",        "APPROVED",  user=shelly, ai_passed=True,  ai_score=90, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "APPROVED",  user=shelly, ai_passed=True,  ai_score=93, ai_comment="Licence front clear."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",  user=shelly, ai_passed=True,  ai_score=92, ai_comment="Licence back clear."),
            ],
        },

        # 24. Andre — REPLACEMENT — ESCALATED by Omar_off (branch 081)
        #     Suspicious circumstances — second replacement in 12 months
        {
            "user": andre, "officer": omar_off,
            "transaction_type": "REPLACEMENT", "status": "ESCALATED",
            "pickup_collectorate_code": "081", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(3),
            "payment_reference": "pi_andre_esc_2026", "payment_confirmed_at": days_ago(3),
            "officer_comment": "This is the applicant's second replacement request within 12 months. Policy requires supervisory approval for repeat replacements.",
            "officer_decision_at": days_ago(1),
            "escalated_to_supervisor_at": days_ago(1),
            "escalation_reason": "Second replacement request within 12 months — policy requires supervisory approval.",
            "verification": verif(andre, verified_at=days_ago(3, hour=9)),
            "notifications": [
                {"recipient": andre, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your replacement application has been escalated for senior review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": andre,    "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": andre,    "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": omar_off, "comment": "Officer started review"},
                {"event_type": "ESCALATION",     "from_status": "UNDER_REVIEW","to_status": "ESCALATED",    "by": omar_off, "comment": "Second replacement in 12 months. Escalating per policy."},
            ],
            "documents": replacement_docs(andre, review="APPROVED"),
        },

        # ══════════════════════════════════════════════════════════════════
        # ADDITIONAL SUPERVISOR QUEUE — more escalated + forwarded cases
        # to make the supervisor dashboard look busy for live demo
        # ══════════════════════════════════════════════════════════════════

        # 25. Devon Clarke — RENEWAL — ESCALATED by Karen (021)
        #     Address on ID does not match licence record
        {
            "user": devon_a, "officer": karen,
            "transaction_type": "RENEWAL", "status": "ESCALATED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(6),
            "payment_reference": "pi_devon_esc_2026", "payment_confirmed_at": days_ago(6),
            "officer_comment": "Address on National ID (19 Dunrobin Ave) does not match licence record (19 Dunrobin Ave, Annexe). Possible residence discrepancy — escalating.",
            "officer_decision_at": days_ago(2),
            "escalated_to_supervisor_at": days_ago(2),
            "escalation_reason": "Address discrepancy between National ID and licence record. Requires senior verification.",
            "verification": verif(devon_a, verified_at=days_ago(6, hour=9)),
            "notifications": [
                {"recipient": devon_a, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your renewal application has been escalated for senior review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": devon_a, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": devon_a, "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,   "comment": "Officer started review"},
                {"event_type": "ESCALATION",     "from_status": "UNDER_REVIEW","to_status": "ESCALATED",    "by": karen,   "comment": "Address discrepancy between National ID and licence record. Escalating."},
            ],
            "documents": renewal_docs(devon_a, review="APPROVED"),
        },

        # 26. Petra — REPLACEMENT — PENDING_SUPERVISOR_APPROVAL (forwarded by Stacy, 081)
        #     Borderline liveness check — officer satisfied but forwarding for sign-off
        {
            "user": petra, "officer": stacy,
            "transaction_type": "REPLACEMENT", "status": "PENDING_SUPERVISOR_APPROVAL",
            "pickup_collectorate_code": "081", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(3),
            "payment_reference": "pi_petra_fwd_2026", "payment_confirmed_at": days_ago(3),
            "officer_comment": "Liveness score borderline (68%) but manual check looks satisfactory. Documents verified. Forwarding for supervisor sign-off.",
            "officer_decision_at": days_ago(1),
            "escalated_to_supervisor_at": days_ago(1),
            "verification": verif(petra, passed=True, liveness=0.68, face=0.89, verified_at=days_ago(3, hour=9)),
            "notifications": [
                {"recipient": petra, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your replacement application has been forwarded to a supervisor for final review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                       "by": petra,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",                   "by": petra,  "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",                "by": stacy,  "comment": "Officer started review — liveness borderline"},
                {"event_type": "FORWARDED",      "from_status": "UNDER_REVIEW","to_status": "PENDING_SUPERVISOR_APPROVAL", "by": stacy,  "comment": "Liveness borderline but documents satisfactory. Forwarding for supervisor sign-off."},
            ],
            "documents": replacement_docs(petra, review="APPROVED"),
        },

        # 27. Curtis — RENEWAL (Class C) — ESCALATED by Calvin (121)
        #     Suspected doctored control number on existing licence
        {
            "user": curtis, "officer": calvin,
            "transaction_type": "RENEWAL", "status": "ESCALATED",
            "pickup_collectorate_code": "121", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": days_ago(5),
            "payment_reference": "pi_curtis_esc_2026", "payment_confirmed_at": days_ago(5),
            "officer_comment": "Control number on submitted licence front (1216677889) appears to have been altered — ink inconsistency on last two digits. Escalating for fraud investigation.",
            "officer_decision_at": days_ago(1),
            "escalated_to_supervisor_at": days_ago(1),
            "escalation_reason": "Possible control number alteration on existing licence front — ink inconsistency detected. Potential fraud.",
            "verification": verif(curtis, face=0.72, verified_at=days_ago(5, hour=9)),
            "notifications": [
                {"recipient": curtis, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your renewal application has been escalated for senior review."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": curtis,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": curtis,  "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": calvin,  "comment": "Officer started review"},
                {"event_type": "ESCALATION",     "from_status": "UNDER_REVIEW","to_status": "ESCALATED",    "by": calvin,  "comment": "Possible control number alteration. Escalating for fraud investigation."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "APPROVED",  user=curtis, ai_passed=True,  ai_score=93, ai_comment="Photo quality acceptable."),
                doc("national_id_front",      "nid_front.jpg",       "APPROVED",  user=curtis, ai_passed=True,  ai_score=89, ai_comment="ID clear.", ocr_data={"ocr_ran": True, "ocr_name": "Curtis Roy Brown", "ocr_dob": "1979-12-05", "ocr_id_number": "667788990", "ocr_confidence": 0.94}),
                doc("national_id_back",       "nid_back.jpg",        "APPROVED",  user=curtis, ai_passed=True,  ai_score=88, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "APPROVED",  user=curtis, ai_passed=True,  ai_score=61, ai_comment="Possible ink inconsistency detected on control number."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",  user=curtis, ai_passed=True,  ai_score=90, ai_comment="Licence back clear."),
            ],
        },

        # 28. Sonia — RENEWAL — PENDING_SUPERVISOR_APPROVAL (forwarded by Andre_off, 141)
        #     High-profile applicant — supervisor sign-off requested
        {
            "user": sonia, "officer": andre_off,
            "transaction_type": "RENEWAL", "status": "PENDING_SUPERVISOR_APPROVAL",
            "pickup_collectorate_code": "141", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(2),
            "payment_reference": "pi_sonia_fwd_2026", "payment_confirmed_at": days_ago(2),
            "officer_comment": "All documents verified and pass quality checks. Applicant is a government administrative officer — forwarding for supervisor sign-off per branch policy.",
            "officer_decision_at": days_ago(0),
            "escalated_to_supervisor_at": days_ago(0),
            "verification": verif(sonia, verified_at=days_ago(2, hour=9)),
            "notifications": [
                {"recipient": sonia, "event_type": "APPLICATION_ESCALATED",
                 "message": "Your renewal application has been forwarded to a supervisor for final approval."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                       "by": sonia,     "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",                   "by": sonia,     "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",                "by": andre_off, "comment": "Officer started review"},
                {"event_type": "FORWARDED",      "from_status": "UNDER_REVIEW","to_status": "PENDING_SUPERVISOR_APPROVAL", "by": andre_off, "comment": "All checks passed. Forwarding for supervisor sign-off per branch policy."},
            ],
            "documents": renewal_docs(sonia, review="APPROVED"),
        },

        # 29. Janet — RENEWAL — WAITING_ON_APPLICANT (requested by Omar_off, 081)
        #     Existing licence scan is unreadable — need better copy
        {
            "user": janet, "officer": omar_off,
            "transaction_type": "RENEWAL", "status": "WAITING_ON_APPLICANT",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(4),
            "payment_reference": "pi_janet_wait_2026", "payment_confirmed_at": days_ago(4),
            "officer_comment": "Existing licence front is too dark and illegible. Please resubmit a clear scan in good lighting.",
            "officer_decision_at": days_ago(2),
            "verification": verif(janet, verified_at=days_ago(4, hour=9)),
            "notifications": [
                {"recipient": janet, "event_type": "RESUBMISSION_REQUESTED",
                 "message": "Your officer has requested a clearer scan of your existing licence. Please log in to resubmit."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",                "by": janet,    "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",            "by": janet,    "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW",         "by": omar_off, "comment": "Officer started review"},
                {"event_type": "RESUBMIT",       "from_status": "UNDER_REVIEW","to_status": "WAITING_ON_APPLICANT", "by": omar_off, "comment": "Existing licence front too dark. Resubmission requested."},
            ],
            "documents": [
                doc("licence_photo",          "passport_photo.jpg",  "APPROVED",           user=janet, ai_passed=True,  ai_score=94, ai_comment="Photo quality good."),
                doc("national_id_front",      "nid_front.jpg",       "APPROVED",           user=janet, ai_passed=True,  ai_score=91, ai_comment="ID clear."),
                doc("national_id_back",       "nid_back.jpg",        "APPROVED",           user=janet, ai_passed=True,  ai_score=90, ai_comment="ID back clear."),
                doc("existing_licence_front", "licence_front.jpg",   "RESUBMIT_REQUIRED",  user=janet, ai_passed=False, ai_score=29, ai_comment="Image too dark — text not readable."),
                doc("existing_licence_back",  "licence_back.jpg",    "APPROVED",           user=janet, ai_passed=True,  ai_score=88, ai_comment="Back acceptable."),
            ],
        },

        # 30. Natalie — RENEWAL — SUBMITTED to Karen (021) today
        #     Additional case to build Karen's queue
        {
            "user": natalie, "officer": karen,
            "transaction_type": "RENEWAL", "status": "SUBMITTED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": days_ago(0),
            "payment_reference": "pi_natalie_sub_021_2026", "payment_confirmed_at": days_ago(0),
            "verification": verif(natalie, verified_at=days_ago(0, hour=9)),
            "notifications": [
                {"recipient": karen, "event_type": "SUBMITTED",
                 "message": "New renewal application submitted by Natalie Gordon."},
            ],
            "events": [
                {"event_type": "CREATED",   "from_status": None,    "to_status": "DRAFT",     "by": natalie, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED", "by": natalie, "comment": "Payment confirmed. Application submitted."},
            ],
            "documents": renewal_docs(natalie, review="PENDING"),
        },

        # 31. Sonia — REPLACEMENT — UNDER_REVIEW by Karen (021)
        #     Picked Constant Spring as her collectorate
        {
            "user": sonia, "officer": karen,
            "transaction_type": "REPLACEMENT", "status": "UNDER_REVIEW",
            "pickup_collectorate_code": "021", "fee_amount": 3000.00,
            "declaration": DECL,
            "submitted_at": days_ago(3),
            "payment_reference": "pi_sonia_rev_021_2026", "payment_confirmed_at": days_ago(3),
            "verification": verif(sonia, verified_at=days_ago(3, hour=9)),
            "events": [
                {"event_type": "CREATED",        "from_status": None,        "to_status": "DRAFT",        "by": sonia,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",     "to_status": "SUBMITTED",    "by": sonia,  "comment": "Payment confirmed. Application submitted."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
            ],
            "documents": replacement_docs(sonia, review="PENDING"),
        },

        # 32. Curtis — AMENDMENT (occupation change) — APPROVED by Karen (021) — 7 days ago
        {
            "user": curtis, "officer": karen,
            "transaction_type": "AMENDMENT", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 4140.00,
            "declaration": DECL,
            "submitted_at": days_ago(10),
            "payment_reference": "pi_curtis_amend_021_2026", "payment_confirmed_at": days_ago(10),
            "officer_comment": "Occupation change approved. Records updated.",
            "officer_decision_at": days_ago(7),
            "new_occupation": "Logistics Coordinator",
            "verification": verif(curtis, verified_at=days_ago(10, hour=9)),
            "digital_licence": True,
            "notifications": [
                {"recipient": curtis, "event_type": "APPLICATION_APPROVED",
                 "message": "Your amendment application has been approved."},
            ],
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": curtis, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": curtis, "comment": "Payment confirmed."},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "Occupation change approved. Records updated."},
            ],
            "documents": amendment_docs(curtis),
        },
    ]

    with db.session.no_autoflush:
        for a in applications:
            app = Application(
                user_id_fk=a["user"].id,
                assigned_officer_id=a["officer"].id if a.get("officer") else None,
                application_number=generate_app_number(),
                transaction_type=a["transaction_type"],
                replacement_reason=a.get("replacement_reason"),
                status=a["status"],
                submitted_at=a.get("submitted_at"),
                pickup_collectorate_code=a.get("pickup_collectorate_code"),
                fee_amount=a.get("fee_amount"),
                declaration=a.get("declaration"),
                address_change_requested=a.get("address_change_requested", False),
                new_address_line1=a.get("new_address_line1"),
                new_address_line2=a.get("new_address_line2"),
                new_parish=a.get("new_parish"),
                new_occupation=a.get("new_occupation"),
                escalated_to_supervisor_at=a.get("escalated_to_supervisor_at"),
                escalation_reason=a.get("escalation_reason"),
                ita_request_sent_at=a.get("ita_request_sent_at"),
                ita_response_received_at=a.get("ita_response_received_at"),
                ita_outcome=a.get("ita_outcome"),
                ita_reference=a.get("ita_reference"),
                officer_comment=a.get("officer_comment"),
                officer_decision_at=a.get("officer_decision_at"),
                payment_reference=a.get("payment_reference"),
                payment_confirmed_at=a.get("payment_confirmed_at"),
                verification_passed=True if a.get("verification") else None,
                liveness_score=int((a["verification"]["liveness_score"] or 0) * 100) if a.get("verification") else None,
                face_match_score=int((a["verification"]["face_match_score"] or 0) * 100) if a.get("verification") else None,
                verified_at=a["verification"]["verified_at"] if a.get("verification") else None,
                verification_attempts=1 if a.get("verification") else 0,
            )
            db.session.add(app)
            db.session.flush()

            # Payment
            if a.get("payment_reference"):
                from models.payment import Payment
                db.session.add(Payment(
                    application_fk=app.id,
                    amount=a["fee_amount"],
                    currency="JMD",
                    status="COMPLETED",
                    stripe_payment_intent_id=a["payment_reference"],
                    payment_reference=a["payment_reference"],
                    paid_at=a.get("payment_confirmed_at"),
                ))

            # Verification result
            if a.get("verification"):
                v = a["verification"]
                db.session.add(VerificationResult(
                    application_fk=app.id,
                    ocr_name=v["ocr_name"],
                    ocr_dob=v["ocr_dob"],
                    ocr_id_number=v["ocr_id_number"],
                    ocr_address=v["ocr_address"],
                    ocr_confidence=v["ocr_confidence"],
                    face_match_score=v["face_match_score"],
                    liveness_score=v["liveness_score"],
                    liveness_passed=v["liveness_passed"],
                    requires_manual_review=v["requires_manual_review"],
                    verified_at=v["verified_at"],
                ))

            # Digital licence (approved apps)
            if a.get("digital_licence"):
                db.session.add(DigitalLicence(
                    application_fk=app.id,
                    user_id_fk=a["user"].id,
                    photo_url=None,
                    generated_at=a.get("officer_decision_at") or a.get("submitted_at"),
                ))

            # Documents
            for d in a.get("documents", []):
                db.session.add(Document(
                    application_fk=app.id,
                    doc_type=d["doc_type"],
                    doc_subtype=d.get("doc_subtype"),
                    version=1,
                    is_current=True,
                    file_path=d["file_path"],
                    original_filename=d["original_filename"],
                    review_status=d["review_status"],
                    ai_check_passed=d.get("ai_check_passed"),
                    ai_check_score=d.get("ai_check_score"),
                    ai_check_comment=d.get("ai_check_comment"),
                    ocr_ran=d.get("ocr_ran", False),
                    ocr_name=d.get("ocr_name"),
                    ocr_dob=d.get("ocr_dob"),
                    ocr_id_number=d.get("ocr_id_number"),
                    ocr_confidence=d.get("ocr_confidence"),
                ))

            # Events
            for e in a.get("events", []):
                db.session.add(ApplicationEvent(
                    application_fk=app.id,
                    triggered_by_user_id=e["by"].id,
                    event_type=e["event_type"],
                    from_status=e.get("from_status"),
                    to_status=e.get("to_status"),
                    comment=e.get("comment"),
                ))

            # ITA correspondence
            for c in a.get("ita_correspondence", []):
                db.session.add(ITACorrespondence(
                    application_fk=app.id,
                    officer_user_id=c["officer"].id,
                    direction=c["direction"],
                    subject=c.get("subject"),
                    body=c.get("body"),
                    ita_reference=c.get("ita_reference"),
                    outcome=c.get("outcome"),
                    sent_at=c.get("sent_at"),
                ))

            # Notifications
            for n in a.get("notifications", []):
                db.session.add(Notification(
                    recipient_user_id=n["recipient"].id,
                    application_fk=app.id,
                    event_type=n["event_type"],
                    message=n["message"],
                    is_read=False,
                ))

    db.session.commit()
    print("Applications seeded.")
    print("")
    print("   HISTORICAL: all 15 applicants have 1 past APPROVED application each.")
    print("")
    print("   CURRENT -- Karen (021):  [only officer at this branch]")
    print("   Marcus     RENEWAL       SUBMITTED           (today)")
    print("   Andre      RENEWAL C     WAITING_ON_APPLICANT (blurry photo)")
    print("   Omar       RENEWAL       SUBMITTED           (yesterday)")
    print("   Dionne     RENEWAL       REJECTED            (name mismatch)")
    print("   Shelly-Ann AMENDMENT     UNDER_REVIEW        (address change)")
    print("   Devon C.   RENEWAL       ESCALATED           (address discrepancy)")
    print("   Natalie    RENEWAL       SUBMITTED           (today)")
    print("   Sonia      REPLACEMENT   UNDER_REVIEW")
    print("   Curtis     AMENDMENT     APPROVED            (7 days ago)")
    print("   Keisha     --            NO CURRENT APP      (2021 history only — demo safe)")
    print("")
    print("   CURRENT -- Devon (022):")
    print("   Sandra     RENEWAL       RESUBMITTED         (expired ID)")
    print("   Trevor     AMENDMENT     SUBMITTED           (address change)")
    print("")
    print("   CURRENT -- Tracey (022):")
    print("   Sandra     RENEWAL       PENDING_SUPERVISOR_APPROVAL (forwarded, borderline face match)")
    print("")
    print("   CURRENT -- Stacy (081):")
    print("   Janet      RENEWAL       UNDER_REVIEW")
    print("   Natalie    REPLACEMENT   ESCALATED           (possible fraud)")
    print("   Rohan      REPLACEMENT   PENDING_ITA         (awaiting ITA clearance)")
    print("   Petra      REPLACEMENT   PENDING_SUPERVISOR_APPROVAL (borderline liveness, forwarded)")
    print("   Janet      REPLACEMENT   APPROVED            (14 days ago)")
    print("   Dionne     RENEWAL       APPROVED            (9 days ago, by Karen)")
    print("")
    print("   CURRENT -- Omar_off (081):")
    print("   Andre      REPLACEMENT   ESCALATED           (2nd replacement in 12mo)")
    print("   Janet      RENEWAL       WAITING_ON_APPLICANT (dark licence scan)")
    print("")
    print("   CURRENT -- Calvin (121):")
    print("   Trevor     RENEWAL C     SUBMITTED           (today)")
    print("   Curtis     RENEWAL C     ESCALATED           (possible control number alteration)")
    print("")
    print("   CURRENT -- Pamela (121):")
    print("   Marcus     REPLACEMENT   ESCALATED           (doc tampering suspected)")
    print("")
    print("   CURRENT -- Nicole (141):")
    print("   Rohan      RENEWAL C     REJECTED            (wrong licence class)")
    print("")
    print("   CURRENT -- Andre_off (141):")
    print("   Natalie    AMENDMENT     UNDER_REVIEW        (occupation change)")
    print("   Sonia      RENEWAL       PENDING_SUPERVISOR_APPROVAL (forwarded, branch policy)")
    print("")
    print("   CURRENT -- Lorraine (011):")
    print("   Omar       REPLACEMENT   PENDING_SUPERVISOR_APPROVAL (liveness fail, forwarded)")
    print("")
    print("   CURRENT -- Marcus_off (011):")
    print("   Shelly-Ann RENEWAL       REJECTED            (selfie photo)")
    print("")
    print("   KEISHA NOTE: No current in-progress application — safe for live demo.")
