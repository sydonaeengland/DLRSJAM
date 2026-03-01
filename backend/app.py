from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text
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

    @app.route("/health")
    def health():
        return jsonify({"status": "DLRSJAM backend running"})

    @app.route("/db-check")
    def db_check():
        db.session.execute(text("SELECT 1"))
        return jsonify({"database": "connected"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)