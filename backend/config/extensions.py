from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()
db.session.execute(text("SELECT 1"))