from flask import Blueprint, jsonify
from models.collectorate import Collectorate

shared_bp = Blueprint("shared", __name__, url_prefix="/api")


@shared_bp.route("/collectorates")
def get_collectorates():
    collectorates = Collectorate.query.filter_by(
        is_active=True
    ).order_by(Collectorate.code).all()
    result = [{
        "code": c.code,
        "name": c.name,
        "full": c.full,
        "parish": c.parish,
        "address": c.address,
        "phone": c.phone,
        "hours": c.hours,
        "lat": c.lat,
        "lng": c.lng,
    } for c in collectorates]
    return jsonify(result)