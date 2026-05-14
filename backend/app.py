# Flask app factory — registers blueprints, initialises the DB, and runs seed data on startup.
from flask import Flask, jsonify
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import text, inspect
from flask_cors import CORS
from datetime import datetime, timezone
import os

from config.extensions import db

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

print("DB_PORT =", os.getenv("DB_PORT"))


def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"postgresql://{os.getenv('DB_USER')}:"
        f"{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:"
        f"{os.getenv('DB_PORT')}/"
        f"{os.getenv('DB_NAME')}"
    )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app, origins=["http://localhost:5173", "https://localhost:5173"], supports_credentials=True)
    
    # register blueprints
    from routes.auth import auth_bp
    from routes.shared import shared_bp
    from routes.applicant import applicant_bp
    from routes.officer import officer_bp
    from routes.supervisor import supervisor_bp
    from routes.admin import admin_bp
    from routes.notifications import notif_bp
    from routes.verification import verify_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(shared_bp)
    app.register_blueprint(applicant_bp)
    app.register_blueprint(officer_bp)
    app.register_blueprint(supervisor_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notif_bp)
    app.register_blueprint(verify_bp)

    @app.route("/health")
    def health():
        return jsonify({"status": "DLRSJAM backend running"})

    @app.route("/db-check")
    def db_check():
        db.session.execute(text("SELECT 1"))
        return jsonify({"database": "connected"})

    @app.route("/tables")
    def tables():
        inspector = inspect(db.engine)
        result = {}
        for table in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns(table)]
            result[table] = columns
        return jsonify(result)

    with app.app_context():
        import models
        db.create_all()
        from utils.seed_data import seed_all
        seed_all()

    return app


app = create_app()


@app.cli.command("purge-expired-data")
def purge_expired_data():
    """Anonymise biometric and personal data on applications past their retention window.
    Approved/rejected: 7 years. Abandoned drafts: 30 days. Run via cron daily."""
    from datetime import timedelta
    from models.application import Application

    with app.app_context():
        now = datetime.now(timezone.utc)

        # Abandoned drafts older than 30 days
        draft_cutoff = now - timedelta(days=30)
        drafts = Application.query.filter(
            Application.status == "DRAFT",
            Application.created_at < draft_cutoff,
        ).all()

        # Closed applications older than 7 years
        closed_cutoff = now - timedelta(days=7 * 365)
        closed = Application.query.filter(
            Application.status.in_(["APPROVED", "REJECTED"]),
            Application.updated_at < closed_cutoff,
        ).all()

        total = 0
        for appl in drafts + closed:
            appl.verification_photo  = None
            appl.face_match_score    = None
            appl.liveness_score      = None
            appl.verification_passed = None
            appl.manual_review_reason = None
            appl.signature_image     = None
            appl.declaration         = None
            total += 1

        db.session.commit()
        print(f"Purged biometric/personal data from {total} application(s).")


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
