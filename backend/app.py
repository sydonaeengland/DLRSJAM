from flask import Flask, jsonify
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import text, inspect
from flask_cors import CORS
import os

from config.extensions import db

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

print("DB_PORT =", os.getenv("DB_PORT"))


def create_app():
    app = Flask(__name__)

    # Database configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"postgresql://{os.getenv('DB_USER')}:"
        f"{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:"
        f"{os.getenv('DB_PORT')}/"
        f"{os.getenv('DB_NAME')}"
    )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

    # ── Blueprints ────────────────────────────────────────────────────────
    from routes.auth import auth_bp
    from routes.shared import shared_bp
    from routes.applicant import applicant_bp
    from routes.officer import officer_bp
    from routes.supervisor import supervisor_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(shared_bp)
    app.register_blueprint(applicant_bp)
    app.register_blueprint(officer_bp)
    app.register_blueprint(supervisor_bp)
    app.register_blueprint(admin_bp)

    # ── Dev routes ────────────────────────────────────────────────────────

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

    # ── Seed ──────────────────────────────────────────────────────────────
    with app.app_context():
        import models
        db.create_all()
        from utils.seed_data import seed_all
        seed_all()

    return app


# Create Flask app
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)