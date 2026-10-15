"""Explicit, idempotent demo data for local SQLite development only."""

import argparse
import getpass
import os

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import password_hasher
from app.core.workflow import record
from app.db.initialize import initialize_database
from app.models.complaint import Complaint, ComplaintStatus
from app.models.domain import ComplaintStatusHistory, Department, User
from app.services.intelligence import save_suggestion
from app.services.incidents import ensure_incident


DEMO_USERS = (
    {"email": "demo.admin@example.com", "full_name": "DEMO Administrator", "role": "admin",
     "department": None, "employee_id": None, "designation": None},
    {"email": "demo.roads@example.com", "full_name": "DEMO Roads Officer", "role": "authority",
     "department": "Roads & Infrastructure", "employee_id": "DEMO-ROADS", "designation": "Demo Officer"},
    {"email": "demo.sanitation@example.com", "full_name": "DEMO Sanitation Officer", "role": "authority",
     "department": "Sanitation", "employee_id": "DEMO-SANITATION", "designation": "Demo Officer"},
    {"email": "demo.water@example.com", "full_name": "DEMO Water Officer", "role": "authority",
     "department": "Water Supply", "employee_id": "DEMO-WATER", "designation": "Demo Officer"},
    {"email": "demo.citizen@example.com", "full_name": "DEMO Citizen", "role": "citizen",
     "department": None, "employee_id": None, "designation": None},
)

SAMPLE_COMPLAINTS = (
    {"key": "roads-v1", "title": "[SAMPLE] Pothole near demo library",
     "description": "SAMPLE DATA ONLY: Broken road pavement near a fictional community library.",
     "category": "Roads & Infrastructure", "address": "SAMPLE location: Demo Library Road",
     "officer": "demo.roads@example.com", "latitude": 22.0, "longitude": 77.0},
    {"key": "sanitation-v1", "title": "[SAMPLE] Uncollected waste at demo market",
     "description": "SAMPLE DATA ONLY: Garbage collection is pending at a fictional market.",
     "category": "Sanitation", "address": "SAMPLE location: Demo Market Street",
     "officer": "demo.sanitation@example.com", "latitude": 22.01, "longitude": 77.01},
    {"key": "water-v1", "title": "[SAMPLE] Leaking pipe at demo park",
     "description": "SAMPLE DATA ONLY: A drinking water supply pipe leaks at a fictional park.",
     "category": "Water Supply", "address": "SAMPLE location: Demo Park Entrance",
     "officer": "demo.water@example.com", "latitude": 22.02, "longitude": 77.02},
)


def seed_demo(engine, password, app_env="development"):
    """Create demo users/reports, preserving existing credentials and report changes."""
    if app_env != "development":
        raise ValueError("Demo seeding is allowed only when APP_ENV=development")
    if engine.dialect.name != "sqlite":
        raise ValueError("Demo seeding is allowed only for a local SQLite database")
    if not isinstance(password, str) or not 10 <= len(password) <= 128 or not password.strip():
        raise ValueError("Demo password must contain 10-128 characters")

    initialize_database(engine)
    with Session(engine) as db, db.begin():
        departments = {department.name: department for department in db.scalars(select(Department))}
        users = {}
        profiles = {}
        # Validate every reserved identity before creating users or reports.
        for spec in DEMO_USERS:
            department = departments.get(spec["department"])
            if spec["department"] and (department is None or not department.is_active):
                raise ValueError("A demo department is missing or inactive; existing data was preserved")
            profile = {
                "full_name": spec["full_name"], "role": spec["role"],
                "department_id": department.id if department else None,
                "employee_id": spec["employee_id"], "designation": spec["designation"],
            }
            existing = db.scalars(select(User).where(func.lower(User.email) == spec["email"])).all()
            if len(existing) > 1:
                raise ValueError("A reserved demo identity conflicts with existing accounts")
            user = existing[0] if existing else None
            if user and (not user.is_active or any(getattr(user, key) != value for key, value in profile.items())):
                raise ValueError("A reserved demo identity has a conflicting role or profile; no accounts changed")
            if spec["employee_id"]:
                employee = db.scalars(select(User).where(User.employee_id == spec["employee_id"])).all()
                if any(user is None or item.id != user.id for item in employee):
                    raise ValueError("A reserved demo employee identifier is already in use")
            users[spec["email"]] = user
            profiles[spec["email"]] = profile

        users_created = 0
        for email, user in users.items():
            if user is None:
                user = User(email=email, password_hash=password_hasher.hash(password), **profiles[email])
                db.add(user)
                users[email] = user
                users_created += 1
        db.flush()

        citizen = users["demo.citizen@example.com"]
        admin = users["demo.admin@example.com"]
        complaints_created = 0
        for sample in SAMPLE_COMPLAINTS:
            marker = "Sample complaint submitted (demo seed: " + sample["key"] + ")"
            # Timeline markers survive title and status changes during frontend testing.
            exists = db.scalar(select(Complaint.id).join(ComplaintStatusHistory).where(
                Complaint.citizen_id == citizen.id, ComplaintStatusHistory.remarks == marker,
                ComplaintStatusHistory.changed_by_user_id == citizen.id,
            ))
            if exists is not None:
                continue
            title_collision = db.scalar(select(Complaint.id).where(
                Complaint.citizen_id == citizen.id, Complaint.title == sample["title"],
            ))
            if title_collision is not None:
                raise ValueError("A reserved sample title already exists without its seed marker; data was preserved")
            complaint = Complaint(
                title=sample["title"], description=sample["description"], category=sample["category"],
                latitude=sample["latitude"], longitude=sample["longitude"], address=sample["address"],
                citizen_id=citizen.id, severity="medium", priority="medium", status=ComplaintStatus.submitted,
            )
            db.add(complaint)
            db.flush()
            ensure_incident(db, complaint)
            save_suggestion(db, complaint)
            record(db, complaint, citizen, None, marker)
            department = departments[sample["category"]]
            complaint.assigned_department_id = department.id
            complaint.assigned_department = department.name
            complaint.assigned_officer_id = users[sample["officer"]].id
            complaint.status = ComplaintStatus.assigned
            record(db, complaint, admin, ComplaintStatus.submitted, "Sample complaint assigned to a demo officer",
                   event="complaint_assigned")
            complaints_created += 1

    # No ORM objects, passwords, hashes, or connection settings leave the seeder.
    return {"users_created": users_created, "complaints_created": complaints_created}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Create clearly labeled local SQLite demo data")
    parser.add_argument("--yes", action="store_true", help="Explicitly opt in to creating demo accounts and sample reports")
    args = parser.parse_args(argv)
    if not args.yes:
        parser.error("Pass --yes to explicitly allow creation of local demo data")

    from app.core.config import settings
    from app.db.database import engine

    if settings.app_env != "development" or engine.dialect.name != "sqlite":
        parser.error("Demo seeding requires APP_ENV=development and a local SQLite database")
    password = os.getenv("SEED_DEMO_PASSWORD")
    if password is None:
        password = getpass.getpass("Demo password (10-128 characters; used only for new demo accounts): ")
        if password != getpass.getpass("Confirm demo password: "):
            parser.error("Passwords do not match")
    try:
        result = seed_demo(engine, password, app_env=settings.app_env)
    except ValueError as error:
        parser.error(str(error))
    print(f"Demo seed complete: {result['users_created']} accounts and {result['complaints_created']} sample complaints created.")
    print("Existing accounts, passwords, and sample workflow changes were preserved.")


if __name__ == "__main__":
    main()
