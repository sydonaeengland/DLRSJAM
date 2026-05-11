# Deepfake detection endpoint — receives a base64 frame from the frontend and runs DeepFace anti-spoof analysis.
import os
import base64
import tempfile
import logging
from flask import Blueprint, request, jsonify
from utils.auth import require_applicant

log = logging.getLogger(__name__)

verify_bp = Blueprint("verification", __name__, url_prefix="/api/verify")


@verify_bp.route("/deepface", methods=["POST"])
@require_applicant
def deepface_check(user):
    data      = request.get_json(force=True) or {}
    frame_b64 = data.get("frame")

    if not frame_b64:
        return jsonify({"error": "No frame provided"}), 400

    # strip data URL prefix if present
    if "," in frame_b64:
        frame_b64 = frame_b64.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(frame_b64)
    except Exception:
        return jsonify({"error": "Invalid base64"}), 400

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(img_bytes)
            tmp_path = f.name

        from deepface import DeepFace

        # DeepFace raises an exception when it detects a spoof — catch it separately
        try:
            result = DeepFace.analyze(
                img_path=tmp_path,
                actions=["emotion"],
                anti_spoofing=True,
                enforce_detection=False,
                silent=True,
            )
            face    = result[0] if isinstance(result, list) else result
            is_real = face.get("is_real", True)
            score   = face.get("antispoof_score", None)
        except Exception as spoof_err:
            msg = str(spoof_err).lower()
            if "spoof" in msg:
                # DeepFace explicitly flagged this as a spoof
                return jsonify({"is_real": False, "score": 0.0}), 200
            raise  # re-raise unexpected errors

        return jsonify({
            "is_real": is_real,
            "score":   round(float(score), 4) if score is not None else None,
        }), 200

    except Exception as e:
        log.warning(f"DeepFace anti-spoof failed: {e}")
        return jsonify({"is_real": None, "score": None, "error": str(e)}), 200
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
