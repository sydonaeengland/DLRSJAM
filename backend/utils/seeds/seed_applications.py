from config.extensions import db
from models.user import User
from models.application import Application
from models.document import Document
from models.application_event import ApplicationEvent
from datetime import datetime, timezone
import random
import string


def generate_app_number():
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"DL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{suffix}"


def dt(year, month, day, hour=10, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def seed_applications():

    ApplicationEvent.query.delete()
    Document.query.delete()
    Application.query.delete()
    db.session.commit()

    # Staff
    karen   = User.query.filter_by(email="k.brown@taj.gov.jm").first()
    devon   = User.query.filter_by(email="d.morgan@taj.gov.jm").first()
    stacy   = User.query.filter_by(email="s.williams@taj.gov.jm").first()

    # Applicants
    marcus  = User.query.filter_by(email="marcus.campbell@email.com").first()
    janet   = User.query.filter_by(email="janet.reid@email.com").first()
    trevor  = User.query.filter_by(email="trevor.brown@email.com").first()
    sandra  = User.query.filter_by(email="sandra.williams@email.com").first()
    keisha  = User.query.filter_by(email="keisha.thompson@email.com").first()
    andre   = User.query.filter_by(email="andre.morgan@email.com").first()
    natalie = User.query.filter_by(email="natalie.gordon@email.com").first()
    rohan   = User.query.filter_by(email="rohan.bennett@email.com").first()
    shelly  = User.query.filter_by(email="shellyann.clarke@email.com").first()
    omar    = User.query.filter_by(email="omar.wright@email.com").first()
    dionne  = User.query.filter_by(email="dionne.francis@email.com").first()

    if not marcus or not karen:
        print("   ⚠️  Users not found — skipping applications seed")
        return

    DECL = "I hereby declare that all information provided in this application is true, accurate and complete to the best of my knowledge and belief."

    # ── PAST applications (historically accurate dates) ───────────────────
    # These represent the renewal that PRODUCED the current licence on file.
    # Submitted ~1 week before the issue_date, approved ~1-2 weeks after.
    # None of these block the applicant from starting a NEW application now.

    applications = [

        # Marcus — previous renewal submitted Mar 2021 → produced licence issued Mar 15 2021
        # Status: APPROVED (historical). Now expired Mar 2026, can renew again.
        {
            "user": marcus, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 3, 8),
            "officer_decision_at": dt(2021, 3, 15),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_marcus_2021",
            "payment_confirmed_at": dt(2021, 3, 8),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": marcus, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": marcus, "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Janet — previous renewal submitted Jun 2021 → produced licence issued Jun 20 2021
        # Status: APPROVED (historical). Expires Jun 2026, can renew now.
        {
            "user": janet, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 6, 13),
            "officer_decision_at": dt(2021, 6, 20),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_janet_2021",
            "payment_confirmed_at": dt(2021, 6, 13),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": janet,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": janet,  "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Trevor — previous renewal (Class C) submitted Oct 2023 → issued Nov 5 2023
        # Status: APPROVED (historical). Expires Nov 2028, use for AMENDMENT now.
        {
            "user": trevor, "officer": devon,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "141", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2023, 10, 29),
            "officer_decision_at": dt(2023, 11, 5),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_trevor_2023",
            "payment_confirmed_at": dt(2023, 10, 29),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": trevor, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": trevor, "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": devon,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": devon,  "comment": "Class C renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Sandra — previous renewal submitted May 2020 → issued May 30 2020
        # Status: APPROVED (historical). Expired May 2025, can renew again.
        {
            "user": sandra, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "022", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2020, 5, 23),
            "officer_decision_at": dt(2020, 5, 30),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_sandra_2020",
            "payment_confirmed_at": dt(2020, 5, 23),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": sandra, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": sandra, "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Keisha — previous renewal submitted Apr 2021 → issued Apr 26 2021
        # Status: APPROVED (historical). Expires Apr 26 2026, can renew now (9 days).
        {
            "user": keisha, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 4, 19),
            "officer_decision_at": dt(2021, 4, 26),
            "officer_comment": "All documents verified. Renewal approved.",
            "payment_reference": "pi_hist_keisha_2021",
            "payment_confirmed_at": dt(2021, 4, 19),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": keisha, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": keisha, "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "All documents verified. Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Andre — previous Class C renewal submitted Aug 2021 → issued Aug 12 2021
        # Status: APPROVED (historical). Expires May 2026, can renew (25 days).
        {
            "user": andre, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "021", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 8, 5),
            "officer_decision_at": dt(2021, 8, 12),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_andre_2021",
            "payment_confirmed_at": dt(2021, 8, 5),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": andre,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": andre,  "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "Class C renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Natalie — previous renewal submitted Feb 2023 → issued Feb 28 2023
        # Status: APPROVED (historical). Expires Feb 2028. Use for REPLACEMENT (DAMAGED) now.
        {
            "user": natalie, "officer": stacy,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "081", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2023, 2, 21),
            "officer_decision_at": dt(2023, 2, 28),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_natalie_2023",
            "payment_confirmed_at": dt(2023, 2, 21),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": natalie, "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": natalie, "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": stacy,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": stacy,   "comment": "Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Rohan — previous Class C renewal submitted Jun 2019 → issued Jun 19 2019
        # Status: APPROVED (historical). Expired Jun 2024 (>1yr). 
        # Can only do REPLACEMENT (LOST) now, ITA fee + renewal = $10,200
        {
            "user": rohan, "officer": devon,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "141", "fee_amount": 7200.00,
            "declaration": DECL,
            "submitted_at": dt(2019, 6, 12),
            "officer_decision_at": dt(2019, 6, 19),
            "officer_comment": "Class C renewal approved.",
            "payment_reference": "pi_hist_rohan_2019",
            "payment_confirmed_at": dt(2019, 6, 12),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": rohan,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": rohan,  "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": devon,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": devon,  "comment": "Class C renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Shelly-Ann — previous renewal submitted Aug 2022 → issued Sep 3 2022
        # Status: APPROVED (historical). Expires Sep 2027. Use for AMENDMENT now.
        {
            "user": shelly, "officer": devon,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "131", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2022, 8, 27),
            "officer_decision_at": dt(2022, 9, 3),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_shelly_2022",
            "payment_confirmed_at": dt(2022, 8, 27),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": shelly,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": shelly,  "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": devon,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": devon,   "comment": "Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Omar — previous renewal submitted May 2021 → issued May 25 2021
        # Status: APPROVED (historical). Expires May 2026, can renew (38 days).
        {
            "user": omar, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "011", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2021, 5, 18),
            "officer_decision_at": dt(2021, 5, 25),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_omar_2021",
            "payment_confirmed_at": dt(2021, 5, 18),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": omar,   "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": omar,   "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,  "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,  "comment": "Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
        },

        # Dionne — previous renewal submitted Oct 2020 → issued Oct 17 2020
        # Status: APPROVED (historical). Expired Oct 2025, can renew now.
        # This is the person whose NEXT application will be REJECTED in officer testing
        {
            "user": dionne, "officer": karen,
            "transaction_type": "RENEWAL", "status": "APPROVED",
            "pickup_collectorate_code": "101", "fee_amount": 5400.00,
            "declaration": DECL,
            "submitted_at": dt(2020, 10, 10),
            "officer_decision_at": dt(2020, 10, 17),
            "officer_comment": "Renewal approved.",
            "payment_reference": "pi_hist_dionne_2020",
            "payment_confirmed_at": dt(2020, 10, 10),
            "events": [
                {"event_type": "CREATED",        "from_status": None,          "to_status": "DRAFT",        "by": dionne,  "comment": "Application created"},
                {"event_type": "SUBMITTED",      "from_status": "DRAFT",       "to_status": "SUBMITTED",    "by": dionne,  "comment": "Submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED",   "to_status": "UNDER_REVIEW", "by": karen,   "comment": "Officer started review"},
                {"event_type": "APPROVED",       "from_status": "UNDER_REVIEW","to_status": "APPROVED",     "by": karen,   "comment": "Renewal approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO",        "file_path": "uploads/seed/photo.jpg",    "original_filename": "photo.jpg",        "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_FRONT",     "file_path": "uploads/seed/nid_front.jpg","original_filename": "nid_front.jpg",    "review_status": "APPROVED"},
                {"doc_type": "NATIONAL_ID_BACK",      "file_path": "uploads/seed/nid_back.jpg","original_filename": "nid_back.jpg",     "review_status": "APPROVED"},
                {"doc_type": "EXISTING_LICENCE_FRONT","file_path": "uploads/seed/lic_front.jpg","original_filename": "licence_front.jpg","review_status": "APPROVED"},
            ]
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
                ita_request_sent_at=a.get("ita_request_sent_at"),
                officer_comment=a.get("officer_comment"),
                officer_decision_at=a.get("officer_decision_at"),
                payment_reference=a.get("payment_reference"),
                payment_confirmed_at=a.get("payment_confirmed_at"),
            )
            db.session.add(app)
            db.session.flush()

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
                ))

            for e in a.get("events", []):
                db.session.add(ApplicationEvent(
                    application_fk=app.id,
                    triggered_by_user_id=e["by"].id,
                    event_type=e["event_type"],
                    from_status=e.get("from_status"),
                    to_status=e.get("to_status"),
                    comment=e.get("comment"),
                ))

    db.session.commit()
    print("✅ Applications seeded. (All historical — APPROVED. All applicants free to apply now.)")
    print("   Marcus    — RENEWAL approved Mar 2021  → licence expires Mar 2026 — CAN RENEW NOW")
    print("   Janet     — RENEWAL approved Jun 2021  → licence expires Jun 2026 — CAN RENEW (63 days)")
    print("   Trevor    — RENEWAL approved Nov 2023  → licence expires Nov 2028 — AMENDMENT only")
    print("   Sandra    — RENEWAL approved May 2020  → licence expires May 2025 — CAN RENEW NOW")
    print("   Keisha    — RENEWAL approved Apr 2021  → licence expires Apr 2026 — CAN RENEW (9 days)")
    print("   Andre     — RENEWAL approved Aug 2021  → licence expires May 2026 — CAN RENEW (25 days) Class C")
    print("   Natalie   — RENEWAL approved Feb 2023  → licence expires Feb 2028 — REPLACEMENT only")
    print("   Rohan     — RENEWAL approved Jun 2019  → licence expired Jun 2024  — REPLACEMENT only (>1yr)")
    print("   Shelly-Ann — RENEWAL approved Sep 2022 → licence expires Sep 2027 — AMENDMENT only")
    print("   Omar      — RENEWAL approved May 2021  → licence expires May 2026 — CAN RENEW (38 days)")
    print("   Dionne    — RENEWAL approved Oct 2020  → licence expired Oct 2025  — CAN RENEW NOW")