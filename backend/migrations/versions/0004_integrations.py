"""Optional location, shared incidents, purpose-scoped email OTPs, private evidence."""
from alembic import op
import sqlalchemy as sa

revision = "0004_integrations"
down_revision = "0003_workflow_audit"
branch_labels = None
depends_on = None

LOCATION = [
    sa.Column("location_accuracy_m", sa.Float(), nullable=True),
    sa.Column("locality", sa.String(100), nullable=True),
    sa.Column("area", sa.String(100), nullable=True),
    sa.Column("ward", sa.String(100), nullable=True),
    sa.Column("incident_id", sa.Integer(), nullable=True),
    sa.Column("incident_link_method", sa.String(30), nullable=True),
    sa.Column("incident_link_reason", sa.Text(), nullable=True),
    sa.Column("incident_link_score", sa.Float(), nullable=True),
    sa.Column("incident_link_distance_m", sa.Float(), nullable=True),
]
STORAGE = [
    sa.Column("storage_bucket", sa.String(255), nullable=True),
    sa.Column("storage_object", sa.String(1024), nullable=True),
    sa.Column("content_type", sa.String(100), nullable=True),
    sa.Column("size_bytes", sa.Integer(), nullable=True),
]
INCIDENT_SELECT = """
id,COALESCE(status,'submitted'),COALESCE(priority,severity,'medium'),
assigned_department_id,assigned_officer_id,resolution_notes,evidence_url,resolved_at,
COALESCE(created_at,CURRENT_TIMESTAMP),COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)
"""


def defer_rebuild_constraints():
    if op.get_bind().dialect.name == "sqlite":
        # Only defer while batch copies a referenced table. Validate the complete
        # restored schema before clearing SQLite's transient DROP TABLE violations.
        op.execute("PRAGMA defer_foreign_keys=ON")


def validate_rebuild():
    if op.get_bind().dialect.name == "sqlite":
        if op.get_bind().exec_driver_sql("PRAGMA foreign_key_check").first():
            raise RuntimeError("Migration aborted: database foreign key validation failed")
        op.execute("PRAGMA defer_foreign_keys=OFF")


def upgrade():
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("password_otps", sa.Column("purpose", sa.String(30), nullable=False, server_default="password_reset"))
    op.create_table("incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
        sa.Column("assigned_department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("assigned_officer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.String(2048), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False))
    for column in ("assigned_department_id", "assigned_officer_id"):
        op.create_index("ix_incidents_" + column, "incidents", [column])
    defer_rebuild_constraints()
    with op.batch_alter_table("complaints") as batch:
        for name, kind in (("latitude", sa.Float()), ("longitude", sa.Float()), ("address", sa.String(500))):
            batch.alter_column(name, existing_type=kind, nullable=True)
        for column in LOCATION:
            batch.add_column(column.copy())
        batch.create_foreign_key("fk_complaints_incident_id", "incidents", ["incident_id"], ["id"])
        batch.create_index("ix_complaints_incident_id", ["incident_id"])
    with op.batch_alter_table("complaint_evidence") as batch:
        batch.alter_column("image_url", existing_type=sa.String(2048), nullable=True)
        for column in STORAGE:
            batch.add_column(column.copy())
    # Preserve all legacy IDs and workflow values; grouping is an explicit staff action.
    op.execute(sa.text(f"INSERT INTO incidents(id,status,priority,assigned_department_id,assigned_officer_id,resolution_notes,evidence_url,resolved_at,created_at,updated_at) SELECT {INCIDENT_SELECT} FROM complaints"))
    op.execute(sa.text("""
        UPDATE complaints SET incident_id=id, incident_link_method='legacy',
            status=COALESCE(status,'submitted'),
            priority=COALESCE(priority,severity,'medium'),
            verification_status=COALESCE(verification_status,'pending'),
            created_at=COALESCE(created_at,CURRENT_TIMESTAMP),
            updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)
    """))
    if op.get_bind().dialect.name == "postgresql":
        op.execute("SELECT setval(pg_get_serial_sequence('incidents','id'), COALESCE((SELECT MAX(id) FROM incidents),1), EXISTS(SELECT 1 FROM incidents))")
    validate_rebuild()


def downgrade():
    if not op.get_context().as_sql:
        connection = op.get_bind()
        if connection.scalar(sa.text("SELECT COUNT(*) FROM complaints WHERE latitude IS NULL OR longitude IS NULL OR address IS NULL")):
            raise RuntimeError("Downgrade would require inventing missing location data; keep revision 0004")
        if connection.scalar(sa.text("SELECT COUNT(*) FROM complaint_evidence WHERE image_url IS NULL")):
            raise RuntimeError("Downgrade would lose private evidence metadata; keep revision 0004")
    defer_rebuild_constraints()
    with op.batch_alter_table("complaint_evidence") as batch:
        for column in reversed(STORAGE):
            batch.drop_column(column.name)
        batch.alter_column("image_url", existing_type=sa.String(2048), nullable=False)
    with op.batch_alter_table("complaints") as batch:
        batch.drop_index("ix_complaints_incident_id")
        batch.drop_constraint("fk_complaints_incident_id", type_="foreignkey")
        for column in reversed(LOCATION):
            batch.drop_column(column.name)
        for name, kind in (("latitude", sa.Float()), ("longitude", sa.Float()), ("address", sa.String(500))):
            batch.alter_column(name, existing_type=kind, nullable=False)
    op.drop_table("incidents")
    op.drop_column("password_otps", "purpose")
    op.drop_column("users", "email_verified")
    validate_rebuild()
