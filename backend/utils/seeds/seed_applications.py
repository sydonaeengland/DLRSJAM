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
    return f"APP-2026-{suffix}"


def seed_applications():
    marcus  = User.query.filter_by(email="marcus.campbell@email.com").first()
    janet   = User.query.filter_by(email="janet.reid@email.com").first()
    trevor  = User.query.filter_by(email="trevor.brown@email.com").first()
    sandra  = User.query.filter_by(email="sandra.williams@email.com").first()
    keisha  = User.query.filter_by(email="keisha.thompson@email.com").first()
    karen   = User.query.filter_by(email="k.brown@taj.gov.jm").first()
    devon   = User.query.filter_by(email="d.morgan@taj.gov.jm").first()

    if not marcus or not karen:
        print("   ⚠️  Users not found — skipping applications seed")
        return

    applications = [
        {
            "user": marcus,
            "officer": karen,
            "transaction_type": "RENEWAL",
            "status": "SUBMITTED",
            "pickup_collectorate_code": "021",
            "fee_amount": 5400.00,
            "declaration": "I declare that the information provided is true and correct.",
            "submitted_at": datetime(2026, 4, 6, 10, 30, tzinfo=timezone.utc),
            "events": [
                {"event_type": "CREATED", "from_status": None, "to_status": "DRAFT",
                 "triggered_by": marcus, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED",
                 "triggered_by": marcus, "comment": "Application submitted by applicant"},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO", "file_path": "uploads/seed/marcus_photo.jpg",
                 "original_filename": "photo.jpg", "review_status": "PENDING"},
                {"doc_type": "PROOF_OF_ADDRESS", "file_path": "uploads/seed/marcus_address.jpg",
                 "original_filename": "utility_bill.jpg", "review_status": "PENDING"},
            ]
        },
        {
            "user": janet,
            "officer": karen,
            "transaction_type": "REPLACEMENT",
            "replacement_reason": "LOST",
            "status": "UNDER_REVIEW",
            "pickup_collectorate_code": "081",
            "fee_amount": 3000.00,
            "declaration": "I declare that the information provided is true and correct.",
            "submitted_at": datetime(2026, 4, 4, 9, 15, tzinfo=timezone.utc),
            "events": [
                {"event_type": "CREATED", "from_status": None, "to_status": "DRAFT",
                 "triggered_by": janet, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED",
                 "triggered_by": janet, "comment": "Application submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW",
                 "triggered_by": karen, "comment": "Officer started review"},
            ],
            "documents": [
                {"doc_type": "POLICE_REPORT", "file_path": "uploads/seed/janet_police_report.jpg",
                 "original_filename": "police_report.jpg", "review_status": "APPROVED"},
                {"doc_type": "PASSPORT_PHOTO", "file_path": "uploads/seed/janet_photo.jpg",
                 "original_filename": "photo.jpg", "review_status": "PENDING"},
            ]
        },
        {
            "user": trevor,
            "officer": devon,
            "transaction_type": "AMENDMENT",
            "status": "PENDING_ITA",
            "pickup_collectorate_code": "141",
            "fee_amount": 4140.00,
            "address_change_requested": True,
            "new_address_line1": "45 Marcus Garvey Drive",
            "new_address_line2": "",
            "new_parish": "ST. ANDREW",
            "declaration": "I declare that the information provided is true and correct.",
            "submitted_at": datetime(2026, 4, 3, 14, 0, tzinfo=timezone.utc),
            "ita_request_sent_at": datetime(2026, 4, 4, 11, 0, tzinfo=timezone.utc),
            "events": [
                {"event_type": "CREATED", "from_status": None, "to_status": "DRAFT",
                 "triggered_by": trevor, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED",
                 "triggered_by": trevor, "comment": "Application submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW",
                 "triggered_by": devon, "comment": "Officer started review"},
                {"event_type": "ITA_REQUESTED", "from_status": "UNDER_REVIEW", "to_status": "PENDING_ITA",
                 "triggered_by": devon, "comment": "ITA clearance requested"},
            ],
            "documents": [
                {"doc_type": "PROOF_OF_ADDRESS", "file_path": "uploads/seed/trevor_address.jpg",
                 "original_filename": "utility_bill.jpg", "review_status": "APPROVED"},
                {"doc_type": "PASSPORT_PHOTO", "file_path": "uploads/seed/trevor_photo.jpg",
                 "original_filename": "photo.jpg", "review_status": "APPROVED"},
            ]
        },
        {
            "user": sandra,
            "officer": karen,
            "transaction_type": "RENEWAL",
            "status": "ACTION_REQUIRED",
            "pickup_collectorate_code": "022",
            "fee_amount": 5400.00,
            "declaration": "I declare that the information provided is true and correct.",
            "submitted_at": datetime(2026, 4, 1, 8, 0, tzinfo=timezone.utc),
            "officer_comment": "Passport photo does not meet requirements. Please upload a clear photo with plain white background.",
            "events": [
                {"event_type": "CREATED", "from_status": None, "to_status": "DRAFT",
                 "triggered_by": sandra, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED",
                 "triggered_by": sandra, "comment": "Application submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW",
                 "triggered_by": karen, "comment": "Officer started review"},
                {"event_type": "ACTION_REQUIRED", "from_status": "UNDER_REVIEW", "to_status": "ACTION_REQUIRED",
                 "triggered_by": karen, "comment": "Passport photo does not meet requirements."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO", "file_path": "uploads/seed/sandra_photo.jpg",
                 "original_filename": "photo.jpg", "review_status": "REJECTED"},
                {"doc_type": "PROOF_OF_ADDRESS", "file_path": "uploads/seed/sandra_address.jpg",
                 "original_filename": "utility_bill.jpg", "review_status": "APPROVED"},
            ]
        },
        {
            "user": keisha,
            "officer": karen,
            "transaction_type": "RENEWAL",
            "status": "APPROVED",
            "pickup_collectorate_code": "021",
            "fee_amount": 5400.00,
            "declaration": "I declare that the information provided is true and correct.",
            "submitted_at": datetime(2026, 3, 28, 10, 0, tzinfo=timezone.utc),
            "officer_decision_at": datetime(2026, 3, 30, 14, 0, tzinfo=timezone.utc),
            "officer_comment": "All documents verified. Application approved.",
            "events": [
                {"event_type": "CREATED", "from_status": None, "to_status": "DRAFT",
                 "triggered_by": keisha, "comment": "Application created"},
                {"event_type": "SUBMITTED", "from_status": "DRAFT", "to_status": "SUBMITTED",
                 "triggered_by": keisha, "comment": "Application submitted by applicant"},
                {"event_type": "REVIEW_STARTED", "from_status": "SUBMITTED", "to_status": "UNDER_REVIEW",
                 "triggered_by": karen, "comment": "Officer started review"},
                {"event_type": "APPROVED", "from_status": "UNDER_REVIEW", "to_status": "APPROVED",
                 "triggered_by": karen, "comment": "All documents verified. Application approved."},
            ],
            "documents": [
                {"doc_type": "PASSPORT_PHOTO", "file_path": "uploads/seed/keisha_photo.jpg",
                 "original_filename": "photo.jpg", "review_status": "APPROVED"},
                {"doc_type": "PROOF_OF_ADDRESS", "file_path": "uploads/seed/keisha_address.jpg",
                 "original_filename": "utility_bill.jpg", "review_status": "APPROVED"},
            ]
        },
    ]

    with db.session.no_autoflush:
        for a in applications:
            existing = Application.query.filter_by(
                user_id_fk=a["user"].id,
                transaction_type=a["transaction_type"],
                status=a["status"]
            ).first()
            if existing:
                continue

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
                    triggered_by_user_id=e["triggered_by"].id,
                    event_type=e["event_type"],
                    from_status=e.get("from_status"),
                    to_status=e.get("to_status"),
                    comment=e.get("comment"),
                ))

    db.session.commit()
    print("✅ Applications seeded.")
    print("   Marcus  — RENEWAL      — SUBMITTED")
    print("   Janet   — REPLACEMENT  — UNDER_REVIEW")
    print("   Trevor  — AMENDMENT    — PENDING_ITA")
    print("   Sandra  — RENEWAL      — ACTION_REQUIRED")
    print("   Keisha  — RENEWAL      — APPROVED")