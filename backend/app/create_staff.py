"""Local operator CLI; never expose staff provisioning through public registration."""
import argparse
import getpass
from sqlalchemy import select
from app.core.security import password_hasher
from app.db.database import engine, SessionLocal
from app.db.initialize import initialize_database
from app.models.domain import User, Department
from app.schemas.domain import Register

def main():
    parser = argparse.ArgumentParser(description="Provision an authorized local staff account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    parser.add_argument("--role", choices=["admin", "authority"], required=True)
    parser.add_argument("--department-id", type=int)
    parser.add_argument("--employee-id")
    parser.add_argument("--designation")
    args = parser.parse_args()
    password = getpass.getpass("Password (10-128 characters): ")
    if password != getpass.getpass("Confirm password: "):
        parser.error("Passwords do not match")
    try:
        data = Register(email=args.email, full_name=args.full_name, password=password)
    except ValueError:
        parser.error("Invalid email, name or password length")
    initialize_database(engine)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == data.email)):
            parser.error("Email already registered")
        department = db.get(Department, args.department_id) if args.department_id else None
        if args.role == "authority" and (not department or not department.is_active):
            parser.error("Authority requires an active department")
        db.add(User(email=data.email, full_name=data.full_name, password_hash=password_hasher.hash(password),
                    role=args.role, department_id=args.department_id, employee_id=args.employee_id,
                    designation=args.designation))
        db.commit()
    print("Staff account created")

if __name__ == "__main__":
    main()
