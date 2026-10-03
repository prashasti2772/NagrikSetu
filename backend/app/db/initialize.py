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
    if engine.dialect.name == "sqlite":
        with engine.connect() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
            connection.commit()
            try:
                with connection.begin():
                    config.attributes["connection"] = connection
                    command.upgrade(config, "head")
                violations = connection.exec_driver_sql("PRAGMA foreign_key_check").all()
                connection.commit()
                if violations:
                    raise RuntimeError("Database migration left foreign-key violations")
            finally:
                if connection.in_transaction():
                    connection.rollback()
                connection.exec_driver_sql("PRAGMA foreign_keys=ON")
                connection.commit()
                if connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one() != 1:
                    connection.rollback()
                    raise RuntimeError("Could not restore SQLite foreign-key enforcement")
                connection.commit()
    else:
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
    with Session(engine) as db:
        names = set(db.scalars(select(Department.name)))
        for name in DEPARTMENTS:
            if name not in names:
                db.add(Department(name=name))
        db.commit()
