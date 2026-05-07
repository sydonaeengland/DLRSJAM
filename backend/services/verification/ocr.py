import cv2
import pytesseract
import re
from datetime import datetime


def preprocess_for_ocr(image_path: str) -> any:
    img = cv2.imread(image_path)

    # Convert to grayscale — OCR works on single channel images
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply thresholding — makes text black on white background
    # This improves accuracy significantly on ID card text
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

    return thresh


def get_confidence(thresh) -> float:
    data = pytesseract.image_to_data(
        thresh,
        output_type=pytesseract.Output.DICT
    )
    confidences = [
        int(c) for c in data["conf"]
        if c != "-1" and int(c) > 0
    ]
    if not confidences:
        return 0.0
    return round(sum(confidences) / len(confidences) / 100, 4)


def extract_text(thresh) -> str:
    return pytesseract.image_to_string(thresh)


def parse_fields(text: str) -> dict:

    # Name — looks for "Name:" or "NAME:" followed by text
    name_match = re.search(
        r"(?:Name|NAME)[:\s]+([A-Za-z\s]+)", text
    )

    # Date of birth — matches DD/MM/YYYY or DD-MM-YYYY format
    dob_match = re.search(
        r"(\d{2}[\/\-]\d{2}[\/\-]\d{4})", text
    )

    # TRN — 9 digit number, sometimes preceded by "TRN:"
    trn_match = re.search(
        r"(?:TRN[:\s]*)?(\d{9})", text
    )

    # Address — looks for "Address:" followed by text
    address_match = re.search(
        r"(?:Address|ADDRESS)[:\s]+([A-Za-z0-9\s,]+)", text
    )

    # Parse DOB string into a date object
    dob_parsed = None
    if dob_match:
        for fmt in ("%d/%m/%Y", "%d-%m-%Y"):
            try:
                dob_parsed = datetime.strptime(
                    dob_match.group(1), fmt
                ).date()
                break
            except ValueError:
                continue

    return {
        "name":    name_match.group(1).strip()    if name_match    else None,
        "dob":     dob_parsed,
        "trn":     trn_match.group(1)             if trn_match     else None,
        "address": address_match.group(1).strip() if address_match else None,
    }


def run_ocr(image_path: str) -> dict:
    try:
        thresh     = preprocess_for_ocr(image_path)
        confidence = get_confidence(thresh)
        text       = extract_text(thresh)
        fields     = parse_fields(text)

        return {
            "name":       fields["name"],
            "dob":        fields["dob"],
            "id_number":  fields["trn"],
            "address":    fields["address"],
            "confidence": confidence,
            "raw_text":   text,
            "error":      None
        }

    except Exception as e:
        return {
            "name":       None,
            "dob":        None,
            "id_number":  None,
            "address":    None,
            "confidence": 0.0,
            "raw_text":   None,
            "error":      str(e)
        }