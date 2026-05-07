from datetime import datetime, timezone
from config.extensions import db
from models.face_verification import VerificationResult
from backend.services.verification.ocr import run_ocr

# If OCR confidence is below this, flag for manual officer review
CONFIDENCE_THRESHOLD = 0.60


def process_ocr(application_id: int, image_path: str) -> VerificationResult:
    result = run_ocr(image_path)

    # Check if a VerificationResult already exists for this application
    # Face verification may have already created one
    verification = VerificationResult.query.filter_by(
        application_fk=application_id
    ).first()

    # Flag for manual review if confidence is too low
    requires_manual_review = (
        result["confidence"] < CONFIDENCE_THRESHOLD or
        result["id_number"] is None or
        result["error"] is not None
    )

    if verification:
        # Update existing record — face verification already created it
        verification.ocr_name              = result["name"]
        verification.ocr_dob               = result["dob"]
        verification.ocr_id_number         = result["id_number"]
        verification.ocr_address           = result["address"]
        verification.ocr_confidence        = result["confidence"]
        verification.ocr_ran_at            = datetime.now(timezone.utc)
        verification.requires_manual_review = requires_manual_review
    else:
        # Create new record — OCR ran before face verification
        verification = VerificationResult(
            application_fk=application_id,
            ocr_name=result["name"],
            ocr_dob=result["dob"],
            ocr_id_number=result["id_number"],
            ocr_address=result["address"],
            ocr_confidence=result["confidence"],
            ocr_ran_at=datetime.now(timezone.utc),
            requires_manual_review=requires_manual_review
        )
        db.session.add(verification)

    db.session.commit()
    return verification