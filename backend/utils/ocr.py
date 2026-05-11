# OCR utility — preprocesses uploaded ID images and runs Tesseract to extract name, DOB, and ID number. Returns a confidence score.
"""
OCR utility — extracts all identity fields used by DLRSJAM from Jamaican
NID cards and driving licences using Tesseract with image preprocessing.

Extracts per doc type:
  national_id_front    — name, dob, sex, nationality, place_of_birth, trn, address, parish
  national_id_back     — address, parish, trn
  existing_licence_front — name, dob, sex, licence_class, expiry_date, collectorate, trn
  existing_licence_back  — trn, control_number, first_issue_date, licence_class
"""

import re
import os
import logging

log = logging.getLogger(__name__)

# Point pytesseract at the Windows install location
try:
    import pytesseract as _pt
    _win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_win_path):
        _pt.pytesseract.tesseract_cmd = _win_path
except Exception:
    pass

OCR_DOC_TYPES = {
    "national_id_front",
    "national_id_back",
    "existing_licence_front",
    "existing_licence_back",
}

JAMAICAN_PARISHES = {
    "KINGSTON", "ST. ANDREW", "ST. THOMAS", "PORTLAND", "ST. MARY",
    "ST. ANN", "TRELAWNY", "ST. JAMES", "HANOVER", "WESTMORELAND",
    "ST. ELIZABETH", "MANCHESTER", "CLARENDON", "ST. CATHERINE",
}

MONTHS = {"JAN":1,"FEB":2,"MAR":3,"APR":4,"MAY":5,"JUN":6,
          "JUL":7,"AUG":8,"SEP":9,"OCT":10,"NOV":11,"DEC":12}


# Image preprocessing

def _preprocess(img):
    """Grayscale → denoise → adaptive threshold → upscale for Tesseract."""
    import cv2
    import numpy as np

    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)

    h, w = gray.shape
    if max(h, w) < 1200:
        scale = 1200 / max(h, w)
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    gray = cv2.fastNlMeansDenoising(gray, h=10)

    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 21, 8
    )
    return thresh


# Field parsers — extract specific values from raw OCR text

def _parse_name(lines):
    """Full name — 2-4 capitalised words, no digits, 6-60 chars."""
    skip = {
        "JAMAICA", "NATIONAL", "IDENTIFICATION", "CARD", "DATE", "BIRTH",
        "EXPIRY", "ISSUED", "SEX", "MALE", "FEMALE", "NATIONALITY", "PARISH",
        "GOVERNMENT", "TAX", "ADMINISTRATION", "DRIVING", "LICENCE", "LICENSE",
        "VALID", "CLASS", "ROAD", "TRAFFIC", "FRONT", "BACK", "HOLDER",
        "SIGNATURE", "OCCUPATION", "ADDRESS", "PLACE", "CONTROL", "NUMBER",
    }
    pat = re.compile(r"^[A-Z][A-Z'\-]+(?:\s+[A-Z][A-Z'\-]+){1,3}$")
    for line in lines:
        u = line.upper().strip()
        if any(kw in u for kw in skip):
            continue
        if pat.match(u) and 6 <= len(u) <= 60:
            return line.title()
    return None


def _parse_date(lines, skip_keywords=("expir", "issue", "valid", "print", "licen")):
    """Extract a date DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, or YYYY-MM-DD."""
    pat = re.compile(
        r"\b(\d{1,2}[\/\-]\d{2}[\/\-]\d{4}"
        r"|\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}"
        r"|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b",
        re.IGNORECASE
    )
    for line in lines:
        if any(kw in line.lower() for kw in skip_keywords):
            continue
        m = pat.search(line)
        if m:
            return _normalise_date(m.group(0))
    return None


def _parse_expiry(lines):
    """Expiry date — prefer lines that mention expiry/valid."""
    pat = re.compile(
        r"\b(\d{1,2}[\/\-]\d{2}[\/\-]\d{4}"
        r"|\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}"
        r"|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b",
        re.IGNORECASE
    )
    # First try lines explicitly about expiry
    for line in lines:
        if re.search(r"expir|valid\s+until|valid\s+to", line, re.IGNORECASE):
            m = pat.search(line)
            if m:
                return _normalise_date(m.group(0))
    return None


def _normalise_date(s):
    """Return YYYY-MM-DD or original string if unparseable."""
    s = s.strip()
    m = re.match(r"^(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    m = re.match(r"^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$", s)
    if m:
        return s
    m = re.match(r"^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$", s, re.IGNORECASE)
    if m:
        mo = MONTHS.get(m.group(2).upper())
        if mo:
            return f"{m.group(3)}-{str(mo).zfill(2)}-{m.group(1).zfill(2)}"
    return s


def _parse_trn(lines):
    """Jamaican TRN — exactly 9 digits, possibly labelled."""
    # Labelled: "TRN: 123456789" or "T.R.N. 123456789"
    for line in lines:
        if re.search(r"\bT\.?R\.?N\.?\b", line, re.IGNORECASE):
            m = re.search(r"\b(\d{9})\b", line)
            if m:
                return m.group(1)
    # Unlabelled standalone 9-digit number
    for line in lines:
        m = re.fullmatch(r"\s*(\d{9})\s*", line)
        if m:
            return m.group(1)
    return None


def _parse_control_number(lines):
    """10-digit control number on licence back."""
    for line in lines:
        if re.search(r"control|ctrl|no\.?", line, re.IGNORECASE):
            m = re.search(r"\b(\d{10})\b", line)
            if m:
                return m.group(1)
    for line in lines:
        m = re.fullmatch(r"\s*(\d{10})\s*", line)
        if m:
            return m.group(1)
    return None


def _parse_licence_class(lines):
    """Licence class A / B / C."""
    for line in lines:
        if re.search(r"\bclass\b", line, re.IGNORECASE):
            m = re.search(r"\b([ABC])\b", line, re.IGNORECASE)
            if m:
                return m.group(1).upper()
    # Standalone single letter
    for line in lines:
        m = re.fullmatch(r"\s*([ABC])\s*", line.strip(), re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return None


def _parse_sex(lines):
    """M / F on NID or licence."""
    for line in lines:
        u = line.upper()
        if re.search(r"\bSEX\b|\bGENDER\b", u):
            if "FEMALE" in u or re.search(r"\bF\b", u):
                return "F"
            if "MALE" in u or re.search(r"\bM\b", u):
                return "M"
    for line in lines:
        u = line.strip().upper()
        if u in ("M", "F", "MALE", "FEMALE"):
            return "M" if u in ("M", "MALE") else "F"
    return None


def _parse_nationality(lines):
    """Nationality field — typically 'JAMAICAN' or country name."""
    for line in lines:
        if re.search(r"\bnational\b", line, re.IGNORECASE):
            # Next non-blank word that is not "IDENTIFICATION" or "ID"
            words = line.upper().split()
            for w in words:
                if w not in ("NATIONALITY", "NATIONAL", "IDENTIFICATION", "ID", "CARD"):
                    return w.title()
        if re.search(r"\bJAMAICAN\b", line, re.IGNORECASE):
            return "Jamaican"
    return None


def _parse_place_of_birth(lines):
    """Place of birth — labelled line."""
    for i, line in enumerate(lines):
        if re.search(r"place\s+of\s+birth|birth\s+place|pob", line, re.IGNORECASE):
            # Value may be on same line after colon or on next line
            after = re.split(r"[:;]", line, maxsplit=1)
            if len(after) > 1 and after[1].strip():
                return after[1].strip().title()
            if i + 1 < len(lines):
                candidate = lines[i + 1].strip()
                if candidate and not re.search(r"\d{4}", candidate):
                    return candidate.title()
    return None


def _parse_address(lines):
    """Street address — look for numbered street or labelled address field."""
    for i, line in enumerate(lines):
        if re.search(r"\baddress\b", line, re.IGNORECASE):
            after = re.split(r"[:;]", line, maxsplit=1)
            if len(after) > 1 and after[1].strip():
                return after[1].strip().title()
            if i + 1 < len(lines):
                return lines[i + 1].strip().title()
    # Heuristic: line starting with a number followed by a street word
    street_pat = re.compile(r"^\d+[A-Z\s\-\.]+(?:road|rd|street|st|avenue|ave|drive|dr|close|lane|blvd|boulevard|way|crescent)\b", re.IGNORECASE)
    for line in lines:
        if street_pat.search(line):
            return line.strip().title()
    return None


def _parse_parish(lines):
    """Parish — one of the 14 Jamaican parishes."""
    for line in lines:
        u = line.upper()
        for p in JAMAICAN_PARISHES:
            if p in u:
                return p.title()
    return None


def _parse_collectorate(lines):
    """Issuing collectorate on licence front."""
    for line in lines:
        if re.search(r"collectorate|issued\s+at|issuing\s+office", line, re.IGNORECASE):
            after = re.split(r"[:;]", line, maxsplit=1)
            if len(after) > 1 and after[1].strip():
                return after[1].strip().title()
    return None


# Per-doc-type extraction — each document type gets its own fields

def _extract_nid_front(lines):
    return {
        "name":          _parse_name(lines),
        "dob":           _parse_date(lines),
        "sex":           _parse_sex(lines),
        "nationality":   _parse_nationality(lines),
        "place_of_birth":_parse_place_of_birth(lines),
        "trn":           _parse_trn(lines),
        "address":       _parse_address(lines),
        "parish":        _parse_parish(lines),
    }

def _extract_nid_back(lines):
    return {
        "address": _parse_address(lines),
        "parish":  _parse_parish(lines),
        "trn":     _parse_trn(lines),
    }

def _extract_licence_front(lines):
    return {
        "name":          _parse_name(lines),
        "dob":           _parse_date(lines),
        "sex":           _parse_sex(lines),
        "licence_class": _parse_licence_class(lines),
        "expiry_date":   _parse_expiry(lines),
        "trn":           _parse_trn(lines),
        "collectorate":  _parse_collectorate(lines),
    }

def _extract_licence_back(lines):
    return {
        "trn":            _parse_trn(lines),
        "control_number": _parse_control_number(lines),
        "first_issue_date": _parse_date(lines, skip_keywords=("expir",)),
        "licence_class":  _parse_licence_class(lines),
    }


EXTRACTORS = {
    "national_id_front":    _extract_nid_front,
    "national_id_back":     _extract_nid_back,
    "existing_licence_front": _extract_licence_front,
    "existing_licence_back":  _extract_licence_back,
}


# Confidence score — how well the extracted fields match expectations

# How many fields we expect per doc type (only the most important ones)
_EXPECTED = {
    "national_id_front":    ["name", "dob", "trn", "sex"],
    "national_id_back":     ["address", "parish"],
    "existing_licence_front": ["name", "dob", "licence_class", "expiry_date"],
    "existing_licence_back":  ["trn", "control_number"],
}

def _confidence(fields, doc_type):
    expected = _EXPECTED.get(doc_type, list(fields.keys()))
    hits = sum(1 for k in expected if fields.get(k))
    return round(hits / len(expected), 2) if expected else 0.0


# Main entry point — call this with a file path to run OCR

def run_ocr(file_path: str, doc_type: str) -> dict:
    """
    Returns:
      { ran, fields: {name, dob, sex, trn, ...}, confidence, raw_text, error }
    Never raises.
    """
    blank = {"ran": False, "fields": {}, "confidence": None, "raw_text": None, "error": None}
    dt = doc_type.lower()

    if dt not in OCR_DOC_TYPES:
        return {**blank, "error": f"OCR not applicable for {doc_type}"}
    if not os.path.exists(file_path):
        return {**blank, "error": "File not found"}
    if os.path.splitext(file_path)[1].lower() == ".pdf":
        return {**blank, "error": "PDF OCR not supported"}

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return {**blank, "error": "pytesseract or Pillow not installed"}

    try:
        img = Image.open(file_path).convert("RGB")
    except Exception as e:
        return {**blank, "error": f"Could not open image: {e}"}

    try:
        processed = _preprocess(img)
    except Exception:
        processed = img  # fall back to raw image if cv2 fails

    try:
        raw_text = pytesseract.image_to_string(processed, config="--oem 3 --psm 3 -l eng")
    except Exception as e:
        return {**blank, "error": f"Tesseract failed: {e}"}

    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    fields = EXTRACTORS[dt](lines)
    conf   = _confidence(fields, dt)

    return {
        "ran":        True,
        "fields":     fields,
        "confidence": conf,
        "raw_text":   raw_text[:3000],
        "error":      None,
    }
