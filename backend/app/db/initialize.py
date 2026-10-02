"""Idempotent additive upgrade for the original complaint schema."""
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session
from app.db.database import Base
from app.models.domain import Department

DEPARTMENTS = ["Roads & Infrastructure", "Sanitation", "Water Supply", "Street Lighting", "Drainage",
               "Parks & Gardens", "Traffic & Parking", "Public Safety", "Animal Welfare", "Environment", "Other"]

def initialize_database(engine):
    Base.metadata.create_all(engine)
    existing = {column["name"] for column in inspect(engine).get_columns("complaints")}
    columns = {
        "citizen_id": "INTEGER REFERENCES users(id)",
        "assigned_department_id": "INTEGER REFERENCES departments(id)",
        "assigned_officer_id": "INTEGER REFERENCES users(id)",
        "priority": "VARCHAR(20) NOT NULL DEFAULT 'medium'",
        "resolution_notes": "TEXT", "evidence_url": "VARCHAR(2048)",
        "resolved_at": "TIMESTAMP", "verification_status": "VARCHAR(20) NOT NULL DEFAULT 'pending'",
    }
    with engine.begin() as connection:
        for name, ddl in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE complaints ADD COLUMN {name} {ddl}"))
        if "priority" not in existing:
            connection.execute(text("UPDATE complaints SET priority = severity"))
    with Session(engine) as db:
        names = set(db.scalars(select(Department.name)))
        for name in DEPARTMENTS:
            if name not in names:
                db.add(Department(name=name))
        db.commit()
