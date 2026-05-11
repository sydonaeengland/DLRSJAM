# Assignment logic — finds the officer with the lowest active caseload at the right branch and assigns them to a new application.
from datetime import datetime, timezone
from models.officer_profile import OfficerProfile
from models.application import Application
from models.application_event import ApplicationEvent
from config.extensions import db

ACTIVE_STATUSES = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACTION_REQUIRED",
    "RESUBMITTED",
    "RETURNED_TO_OFFICER",
]

WAITING_STATUSES = [
    "SUBMITTED",
    "RESUBMITTED",
]

CAP = 50


def get_active_count(officer_user_id):
    return Application.query.filter(
        Application.assigned_officer_id == officer_user_id,
        Application.status.in_(ACTIVE_STATUSES)
    ).count()


def _pick_lowest(profiles):
    """Return the officer with the lowest active count under cap, or None."""
    best       = None
    best_count = CAP

    for profile in profiles:
        count = get_active_count(profile.user_id_fk)
        if count < best_count:
            best       = profile
            best_count = count

    return best


def auto_assign_officer(app):
    """
    Try to assign an officer at the application's pickup collectorate.
    If all officers there are at capacity, leave unassigned.
    The application stays in the queue (pickup_collectorate_code is set)
    and will be picked up when an officer frees a slot.

    Never assigns cross-collectorate — St. Andrew stays St. Andrew.
    """
    pickup_code = app.pickup_collectorate_code

    if not pickup_code:
        # No collectorate set yet — cannot assign, leave for supervisor
        app.assigned_officer_id = None
        return

    local_officers = OfficerProfile.query.filter_by(
        branch_code=pickup_code,
        is_active_staff=True,
    ).all()

    if not local_officers:
        # No officers at this collectorate at all — leave unassigned
        app.assigned_officer_id = None
        return

    candidate = _pick_lowest(local_officers)

    if candidate:
        app.assigned_officer_id = candidate.user_id_fk
        app.assigned_at = datetime.now(timezone.utc)
        db.session.add(ApplicationEvent(
            application_fk=app.id,
            triggered_by_user_id=candidate.user_id_fk,
            event_type="OFFICER_ASSIGNED",
            comment=f"Auto-assigned to officer {candidate.user_id_fk} at collectorate {pickup_code}",
        ))
    else:
        # All officers at this collectorate are at cap
        # Leave unassigned — will be picked up by drain_queue
        app.assigned_officer_id = None


def drain_queue(officer_user_id):
    """
    Called after an officer closes a case (approve/reject/escalate).
    Looks for the oldest unassigned application at this officer's
    collectorate and assigns it to them if they now have capacity.

    This is what processes the waiting queue.
    """
    profile = OfficerProfile.query.filter_by(
        user_id_fk=officer_user_id
    ).first()

    if not profile or not profile.branch_code:
        return

    # Only assign if officer is now under cap
    current_count = get_active_count(officer_user_id)
    if current_count >= CAP:
        return

    # Find oldest unassigned application waiting at this collectorate
    waiting = Application.query.filter(
        Application.assigned_officer_id == None,
        Application.pickup_collectorate_code == profile.branch_code,
        Application.status.in_(WAITING_STATUSES),
    ).order_by(Application.submitted_at.asc()).first()

    if waiting:
        waiting.assigned_officer_id = officer_user_id
        waiting.assigned_at = datetime.now(timezone.utc)
        db.session.add(ApplicationEvent(
            application_fk=waiting.id,
            triggered_by_user_id=officer_user_id,
            event_type="OFFICER_ASSIGNED",
            comment=f"Assigned from queue to officer {officer_user_id} at collectorate {profile.branch_code}",
        ))