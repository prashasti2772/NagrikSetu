"""Versioned schema upgrades and idempotent reference-data seeding."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.domain import Department

DEPARTMENTS = ["Roads & Infrastructure", "Sanitation", "Water Supply", "Street Lighting", "Drainage",
               "Parks & Gardens", "Traffic & Parking", "Public Safety", "Animal Welfare", "Environment", "Other"]

def migration_config():
    from alembic.config import Config
    from app.core.config import BACKEND_DIR
    return Config(str(BACKEND_DIR / "alembic.ini"))

def initialize_database(engine):
    from alembic import command
    config = migration_config()
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    with Session(engine) as db:
        names = set(db.scalars(select(Department.name)))
        for name in DEPARTMENTS:
            if name not in names:
                db.add(Department(name=name))
        db.commit()
