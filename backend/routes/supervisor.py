# Supervisor routes — queue, application detail, decisions, officer management, and signature.
from flask import Blueprint, jsonify, request, send_file, current_app
from config.extensions import db
from models.application import Application
from models.application_event import ApplicationEvent
from models.licence_record import LicenceRecord
from models.applicant_profile import Profile
from models.supervisor_profile import SupervisorProfile
from models.officer_profile import OfficerProfile
from models.digital_licence import DigitalLicence
from models.document import Document
from models.notification import Notification
from utils.auth import require_supervisor
from datetime import datetime, timezone
import io, base64, os


def _notify(recipient_user_id, application, event_type, message):
    try:
        db.session.add(Notification(
            recipient_user_id=recipient_user_id,
            application_fk=application.id,
            event_type=event_type,
            message=message,
        ))
    except Exception:
        pass

def _remove_bg_for_app(app):
    """Return a base64 data-URL of the licence photo with background removed.
    Falls back to the original photo as a data-URL if rembg is unavailable."""
    import base64
    doc = Document.query.filter_by(
        application_fk=app.id,
        doc_type="licence_photo",
        is_current=True,
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        return None
    with open(doc.file_path, "rb") as f:
        img_bytes = f.read()
    try:
        from rembg import remove
        result = remove(img_bytes)
        return "data:image/png;base64," + base64.b64encode(result).decode()
    except Exception as e:
        current_app.logger.warning(f"rembg failed for app {app.id}: {e}")
        ext = os.path.splitext(doc.file_path)[1].lower().lstrip(".")
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
        return f"data:{mime};base64," + base64.b64encode(img_bytes).decode()


supervisor_bp = Blueprint("supervisor", __name__, url_prefix="/api/supervisor")

SLA_BUSINESS_DAYS = 5


def _sla(submitted_at):
    if not submitted_at:
        return {"status": "On Time", "hours_remaining": None}
    now = datetime.now(timezone.utc)
    if submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    elapsed_hours = (now - submitted_at).total_seconds() / 3600
    deadline_hours = SLA_BUSINESS_DAYS * 8
    remaining = deadline_hours - elapsed_hours
    if remaining < 0:
        return {"status": "Overdue", "hours_remaining": None}
    if remaining < 24:
        return {"status": "NearDeadline", "hours_remaining": round(remaining)}
    return {"status": "On Time", "hours_remaining": None}


def _supervisor_name(user):
    sp = user.supervisorprofile if user else None
    if sp:
        return f"{sp.firstname} {sp.lastname}"
    return user.email if user else "Unknown"


def _get_branch(user):
    """Return the supervisor's branch_code, or None if not set."""
    sp = SupervisorProfile.query.filter_by(user_id_fk=user.id).first()
    return sp.branch_code if sp else None


def _app_summary(a):
    profile = a.applicant.profile if a.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=a.user_id_fk).first()
    officer = a.assigned_officer
    officer_profile = officer.officerprofile if officer else None
    sla = {"status": "On Time", "hours_remaining": None} if a.status in {"APPROVED", "REJECTED"} else _sla(a.submitted_at)
    return {
        "id":                 a.id,
        "application_number": a.application_number,
        "transaction_type":   a.transaction_type,
        "status":             a.status,
        "submitted_at":       a.submitted_at.isoformat() if a.submitted_at else None,
        "escalated_at":       a.escalated_to_supervisor_at.isoformat() if a.escalated_to_supervisor_at else None,
        "escalation_reason":  a.escalation_reason,
        "applicant_name":     f"{profile.firstname} {profile.lastname}" if profile else "—",
        "trn":                licence.trn if licence else "—",
        "officer_name":       f"{officer_profile.firstname} {officer_profile.lastname}" if officer_profile else "—",
        "officer_comment":    a.officer_comment,
        "face_match_score":   a.face_match_score,
        "liveness_score":     a.liveness_score,
        "needs_manual_review": a.needs_manual_review,
        "sla_status":         sla["status"],
        "hours_remaining":    sla["hours_remaining"],
    }


def _officer_branch_codes(branch_code):
    """Return user_ids of officers at the given branch."""
    if not branch_code:
        return set()
    profiles = OfficerProfile.query.filter_by(branch_code=branch_code, is_active_staff=True).all()
    return {p.user_id_fk for p in profiles}


# Profile

@supervisor_bp.route("/profile", methods=["GET"])
@require_supervisor
def get_profile(user):
    sp = SupervisorProfile.query.filter_by(user_id_fk=user.id).first()
    if not sp:
        return jsonify({"error": "Profile not found"}), 404
    branch_name = sp.branch.name if sp.branch else None
    return jsonify({
        "firstname":   sp.firstname,
        "lastname":    sp.lastname,
        "staff_id":    sp.staff_id,
        "department":  sp.department,
        "branch_code": sp.branch_code,
        "branch_name": branch_name,
        "work_email":  sp.work_email,
        "work_phone":  sp.work_phone,
    }), 200


# Queue

@supervisor_bp.route("/queue", methods=["GET"])
@require_supervisor
def get_queue(user):
    """All applications for the supervisor's collectorate, grouped by category."""
    branch_code = _get_branch(user)
    officer_ids = _officer_branch_codes(branch_code)

    # Supervisors see all applications destined for their collectorate:
    # - pickup_collectorate_code matches their branch, OR
    # - assigned to any officer at their branch
    # (Many supervisors can share the same branch — they all see the same pool)
    all_apps_q = Application.query.order_by(Application.submitted_at.asc())
    if branch_code:
        all_apps = [
            a for a in all_apps_q.all()
            if (a.pickup_collectorate_code == branch_code)
            or (a.assigned_officer_id in officer_ids)
        ]
    else:
        # No branch set — see everything (admin-level supervisor)
        all_apps = all_apps_q.all()

    ESCALATED_STATUSES  = {"ESCALATED", "PENDING_SUPERVISOR_APPROVAL"}
    PENDING_STATUSES    = {"UNDER_REVIEW", "SUBMITTED", "RESUBMITTED"}
    RESUBMIT_STATUSES   = {"WAITING_ON_APPLICANT", "ACTION_REQUIRED"}
    COMPLETED_STATUSES  = {"APPROVED", "REJECTED"}

    result = {
        "escalated":     [],
        "pending":       [],
        "resubmissions": [],
        "completed":     [],
        "all":           [],
    }

    officer_map = {}
    from datetime import timedelta
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    for a in all_apps:
        summary = _app_summary(a)
        result["all"].append(summary)

        if a.status in ESCALATED_STATUSES:
            result["escalated"].append(summary)
        elif a.status in PENDING_STATUSES:
            result["pending"].append(summary)
        elif a.status in RESUBMIT_STATUSES:
            result["resubmissions"].append(summary)
        elif a.status in COMPLETED_STATUSES:
            result["completed"].append(summary)

        # Officer stats (only officers in this branch)
        officer = a.assigned_officer
        if officer and (not branch_code or officer.id in officer_ids):
            op = officer.officerprofile
            oid = officer.id
            if oid not in officer_map:
                officer_map[oid] = {
                    "officer_id":   oid,
                    "officer_name": f"{op.firstname} {op.lastname}" if op else officer.email,
                    "branch":       op.branch.name if (op and op.branch) else "—",
                    "active":       0,
                    "escalated":    0,
                    "waiting":      0,
                    "approved_7d":  0,
                }
            om = officer_map[oid]
            if a.status in {"SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "PENDING_SUPERVISOR_APPROVAL"}:
                om["active"] += 1
            if a.status == "ESCALATED":
                om["escalated"] += 1
            if a.status in {"WAITING_ON_APPLICANT", "ACTION_REQUIRED"}:
                om["waiting"] += 1
            if a.status == "APPROVED" and a.officer_decision_at:
                dt = a.officer_decision_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= seven_days_ago:
                    om["approved_7d"] += 1

    result["officer_stats"] = list(officer_map.values())
    result["counts"] = {
        "escalated":     len(result["escalated"]),
        "pending":       len(result["pending"]),
        "resubmissions": len(result["resubmissions"]),
        "completed":     len(result["completed"]),
        "all":           len(result["all"]),
        "approved":      sum(1 for a in all_apps if a.status == "APPROVED"),
        "rejected":      sum(1 for a in all_apps if a.status == "REJECTED"),
    }

    return jsonify(result), 200


# Single application detail

@supervisor_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_supervisor
def get_application(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    profile = app.applicant.profile if app.applicant else None
    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    officer = app.assigned_officer
    officer_profile = officer.officerprofile if officer else None

    documents = [{
        "id":                d.id,
        "doc_type":          d.doc_type,
        "doc_subtype":       d.doc_subtype,
        "file_path":         d.file_path,
        "original_filename": d.original_filename,
        "review_status":     d.review_status,
        "review_comment":    d.review_comment,
        "uploaded_at":       d.uploaded_at.isoformat() if d.uploaded_at else None,
        "is_current":        d.is_current,
    } for d in app.documents if d.is_current]

    events = []
    for e in sorted(app.events, key=lambda x: x.created_at, reverse=True):
        actor = e.triggered_by
        actor_name = "System"
        if actor:
            op = getattr(actor, "officerprofile", None)
            sp = getattr(actor, "supervisorprofile", None)
            pp = getattr(actor, "profile", None)
            if sp:
                actor_name = f"{sp.firstname} {sp.lastname}"
            elif op:
                actor_name = f"{op.firstname} {op.lastname}"
            elif pp:
                actor_name = f"{pp.firstname} {pp.lastname}"
            else:
                actor_name = actor.email
        events.append({
            "event_type":  e.event_type,
            "from_status": e.from_status,
            "to_status":   e.to_status,
            "comment":     e.comment,
            "actor":       actor_name,
            "created_at":  e.created_at.isoformat() if e.created_at else None,
        })

    sla = {"status": "On Time", "hours_remaining": None} if app.status in {"APPROVED", "REJECTED"} else _sla(app.submitted_at)

    supervisor_decision = None
    for e in app.events:
        if e.event_type == "SUPERVISOR_DECISION":
            actor = e.triggered_by
            sp = getattr(actor, "supervisorprofile", None) if actor else None
            supervisor_decision = {
                "decision":            e.to_status,
                "supervisor_name":     f"{sp.firstname} {sp.lastname}" if sp else (actor.email if actor else "—"),
                "timestamp":           e.created_at.isoformat() if e.created_at else None,
                "notes":               e.comment,
                "supervisor_signature": sp.signature_image if sp else None,
            }

    # Find officer decision event (APPROVED/REJECTED by officer, not supervisor)
    officer_decision = None
    for e in sorted(app.events, key=lambda x: x.created_at):
        if e.event_type in ("APPROVED", "REJECTED") and e.triggered_by:
            actor = e.triggered_by
            op = getattr(actor, "officerprofile", None)
            if op:
                officer_decision = {
                    "decision":          e.to_status or e.event_type,
                    "officer_name":      f"{op.firstname} {op.lastname}",
                    "officer_staff_id":  op.staff_id,
                    "timestamp":         e.created_at.isoformat() if e.created_at else None,
                    "notes":             e.comment,
                    "officer_signature": op.signature_image,
                }

    return jsonify({
        "application": {
            "id":                     app.id,
            "application_number":     app.application_number,
            "transaction_type":       app.transaction_type,
            "replacement_reason":     app.replacement_reason,
            "status":                 app.status,
            "submitted_at":           app.submitted_at.isoformat() if app.submitted_at else None,
            "escalated_at":           app.escalated_to_supervisor_at.isoformat() if app.escalated_to_supervisor_at else None,
            "escalation_reason":      app.escalation_reason,
            "officer_comment":        app.officer_comment,
            "declaration":            app.declaration,
            "signature_image":        app.signature_image,
            "declaration_signed_at":  app.declaration_signed_at.isoformat() if app.declaration_signed_at else None,
            "fee_amount":             str(app.fee_amount) if app.fee_amount else None,
            "payment_reference":      app.payment_reference,
            "payment_confirmed_at":   app.payment_confirmed_at.isoformat() if app.payment_confirmed_at else None,
            "trustee_collection":     app.trustee_collection,
            "trustee_name":           app.trustee_name,
            "trustee_contact":        app.trustee_contact,
            "address_change_requested": app.address_change_requested,
            "new_address_line1":      app.new_address_line1,
            "new_address_line2":      app.new_address_line2,
            "new_parish":             app.new_parish,
            "new_occupation":         app.new_occupation,
            "needs_manual_review":    app.needs_manual_review,
            "face_match_score":       app.face_match_score,
            "liveness_score":         app.liveness_score,
            "verification_passed":    app.verification_passed,
            "pickup_collectorate":    app.pickup_collectorate.full if app.pickup_collectorate else None,
            "sla_status":             sla["status"],
            "hours_remaining":        sla["hours_remaining"],
            "supervisor_decision":    supervisor_decision,
            "officer_decision":       officer_decision,
            "documents":              documents,
            "events":                 events,
        },
        "applicant": {
            "firstname":     profile.firstname     if profile else None,
            "lastname":      profile.lastname      if profile else None,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "sex":           licence.sex           if licence else None,
            "phone":         profile.phone         if profile else None,
            "email":         app.applicant.email   if app.applicant else None,
            "address_line1": profile.address_line1 if profile else None,
            "address_line2": profile.address_line2 if profile else None,
            "parish":        profile.parish        if profile else None,
            "occupation":    profile.occupation    if profile else None,
        },
        "licence": {
            "trn":            licence.trn            if licence else None,
            "licence_class":  licence.licence_class  if licence else None,
            "status":         licence.status         if licence else None,
            "expiry_date":    str(licence.expiry_date)    if licence and licence.expiry_date    else None,
            "issue_date":     str(licence.issue_date)     if licence and licence.issue_date     else None,
            "first_issue_date": str(licence.first_issue_date) if licence and licence.first_issue_date else None,
            "control_number": licence.control_number  if licence else None,
            "collectorate":   licence.collectorate    if licence else None,
            "nationality":    licence.nationality    if licence else None,
            "occupation":     licence.occupation     if licence else None,
        },
        "officer": {
            "name":      f"{officer_profile.firstname} {officer_profile.lastname}" if officer_profile else None,
            "staff_id":  officer_profile.staff_id if officer_profile else None,
            "email":     officer.email if officer else None,
            "signature": officer_profile.signature_image if officer_profile else None,
        },
    }), 200


# Document file proxy

@supervisor_bp.route("/applications/<int:app_id>/documents/<int:doc_id>/file", methods=["GET"])
@require_supervisor
def get_document_file(user, app_id, doc_id):
    from models.document import Document
    doc = Document.query.filter_by(id=doc_id, application_fk=app_id, is_current=True).first()
    if not doc or not doc.file_path:
        return jsonify({"error": "Document not found"}), 404

    abs_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), doc.file_path.lstrip("/"))
    if not os.path.exists(abs_path):
        abs_path = os.path.join(os.getcwd(), doc.file_path.lstrip("/\\"))
    if not os.path.exists(abs_path):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(abs_path, as_attachment=False, download_name=doc.original_filename)


# Decisions

@supervisor_bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@require_supervisor
def approve(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    notes = data.get("notes", "").strip()
    if not notes:
        return jsonify({"error": "Approval notes are required"}), 400

    sup_name = _supervisor_name(user)
    prev_status = app.status
    app.status = "APPROVED"
    app.officer_decision_at = datetime.now(timezone.utc)
    app.officer_comment = f"[Supervisor Approved] {notes}"

    if not app.digital_licence:
        photo_url = _remove_bg_for_app(app)
        dl = DigitalLicence(
            application_fk=app.id,
            user_id_fk=app.user_id_fk,
            photo_url=photo_url,
        )
        db.session.add(dl)
        app.digital_licence_generated_at = datetime.now(timezone.utc)

    licence = LicenceRecord.query.filter_by(user_id_fk=app.user_id_fk).first()
    if licence:
        from datetime import date
        from dateutil.relativedelta import relativedelta
        licence.expiry_date = date.today() + relativedelta(years=5)
        licence.issue_date  = date.today()

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="SUPERVISOR_DECISION",
        from_status=prev_status,
        to_status="APPROVED",
        comment=f"Approved by Supervisor {sup_name}: {notes}",
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@require_supervisor
def reject(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    notes = data.get("notes", "").strip()
    if not notes:
        return jsonify({"error": "Rejection reason is required"}), 400

    sup_name = _supervisor_name(user)
    prev_status = app.status
    app.status = "REJECTED"
    app.officer_decision_at = datetime.now(timezone.utc)
    app.officer_comment = f"[Supervisor Rejected] {notes}"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="SUPERVISOR_DECISION",
        from_status=prev_status,
        to_status="REJECTED",
        comment=f"Rejected by Supervisor {sup_name}: {notes}",
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/applications/<int:app_id>/request-resubmit", methods=["POST"])
@require_supervisor
def request_resubmit(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    items    = data.get("items", [])
    comments = data.get("comments", "").strip()
    if not items:
        return jsonify({"error": "At least one item must be selected"}), 400
    if not comments:
        return jsonify({"error": "Comments for the applicant are required"}), 400

    sup_name = _supervisor_name(user)
    prev_status = app.status
    app.status = "WAITING_ON_APPLICANT"
    app.officer_comment = f"[Supervisor Resubmission Request] {comments}\nItems: {', '.join(items)}"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="SUPERVISOR_DECISION",
        from_status=prev_status,
        to_status="WAITING_ON_APPLICANT",
        comment=f"Resubmission requested by Supervisor {sup_name}: {comments} | Items: {', '.join(items)}",
    ))

    _notify(
        app.user_id_fk, app, "RESUBMISSION_REQUESTED",
        f"Action required on application {app.application_number}: {comments}",
    )

    db.session.commit()
    return jsonify({"status": app.status}), 200


@supervisor_bp.route("/applications/<int:app_id>/return-to-officer", methods=["POST"])
@require_supervisor
def return_to_officer(user, app_id):
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "A reason is required when returning to officer"}), 400

    sup_name = _supervisor_name(user)
    prev_status = app.status
    app.status = "UNDER_REVIEW"
    app.officer_comment = f"[Returned by Supervisor {sup_name}] {reason}"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="SUPERVISOR_DECISION",
        from_status=prev_status,
        to_status="UNDER_REVIEW",
        comment=f"Returned to officer by Supervisor {sup_name}: {reason}",
    ))
    db.session.commit()
    return jsonify({"status": app.status}), 200


# Officers at this branch

@supervisor_bp.route("/officers", methods=["GET"])
@require_supervisor
def get_officers(user):
    branch_code = _get_branch(user)
    query = OfficerProfile.query.filter_by(is_active_staff=True)
    if branch_code:
        query = query.filter_by(branch_code=branch_code)
    officers = query.all()
    return jsonify({
        "officers": [{
            "user_id":    o.user_id_fk,
            "name":       f"{o.firstname} {o.lastname}",
            "staff_id":   o.staff_id,
            "department": o.department,
            "branch":     o.branch.full if o.branch else None,
        } for o in officers]
    }), 200


# Assign officer

@supervisor_bp.route("/applications/<int:app_id>/assign", methods=["POST"])
@require_supervisor
def assign_officer(user, app_id):
    from models.user import User as UserModel
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json() or {}
    officer_user_id = data.get("officer_user_id")
    if not officer_user_id:
        return jsonify({"error": "officer_user_id is required"}), 400

    officer = UserModel.query.get(officer_user_id)
    if not officer or not officer.has_role("officer"):
        return jsonify({"error": "Invalid officer"}), 400

    app.assigned_officer_id = officer_user_id
    app.status = "SUBMITTED"

    db.session.add(ApplicationEvent(
        application_fk=app.id,
        triggered_by_user_id=user.id,
        event_type="ASSIGNMENT",
        assigned_to_user_id=officer_user_id,
        comment="Assigned to officer by supervisor",
    ))
    db.session.commit()
    return jsonify({"status": app.status, "assigned_to": officer_user_id}), 200


# Supervisor signature

@supervisor_bp.route("/profile/signature", methods=["GET"])
@require_supervisor
def get_signature(user):
    sp = SupervisorProfile.query.filter_by(user_id_fk=user.id).first()
    if not sp:
        return jsonify({"signature_image": None}), 200
    return jsonify({"signature_image": getattr(sp, "signature_image", None)}), 200


@supervisor_bp.route("/profile/signature", methods=["POST"])
@require_supervisor
def save_signature(user):
    data = request.get_json() or {}
    sig  = data.get("signature_image", "")
    sp = SupervisorProfile.query.filter_by(user_id_fk=user.id).first()
    if not sp:
        return jsonify({"error": "Supervisor profile not found"}), 404
    sp.signature_image = sig
    db.session.commit()
    return jsonify({"ok": True}), 200
