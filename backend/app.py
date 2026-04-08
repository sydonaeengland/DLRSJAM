from flask import Flask, jsonify
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import text, inspect
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

    # ---------------- ROUTES ---------------- #

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

    @app.route("/api/collectorates")
    def get_collectorates():
        from models.collectorate import Collectorate
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

    # CREATE TABLES AND SEED
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