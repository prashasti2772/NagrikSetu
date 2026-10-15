"""Persist assignment snapshots and verification actions; index scoped queries."""
from alembic import op
import sqlalchemy as sa

revision = "0003_workflow_audit"
down_revision = "0002_phase3"
branch_labels = None
depends_on = None

ASSIGNMENT_COLUMNS = {
    "old_department_id": "departments", "new_department_id": "departments",
    "old_officer_id": "users", "new_officer_id": "users",
}
INDEX_COLUMNS = ["citizen_id", "assigned_department_id", "assigned_officer_id", "created_at"]

def upgrade():
    op.add_column("complaint_status_history", sa.Column("action", sa.String(50), nullable=False, server_default="legacy"))
    op.add_column("complaint_status_history", sa.Column("verification_status", sa.String(20), nullable=True))
    # SQLite and PostgreSQL both support adding nullable columns with inline references.
    # Preserve every existing history row without a SQLite table rebuild.
    for column, table in ASSIGNMENT_COLUMNS.items():
        op.execute(sa.text(f"ALTER TABLE complaint_status_history ADD COLUMN {column} INTEGER REFERENCES {table}(id)"))
    for column in INDEX_COLUMNS:
        op.create_index(f"ix_complaints_{column}", "complaints", [column])

def downgrade():
    for column in reversed(INDEX_COLUMNS):
        op.drop_index(f"ix_complaints_{column}", table_name="complaints")
    # Supported by PostgreSQL and SQLite >= 3.35 (the supported Python runtime).
    for column in [*ASSIGNMENT_COLUMNS, "verification_status", "action"]:
        op.execute(sa.text(f"ALTER TABLE complaint_status_history DROP COLUMN {column}"))
