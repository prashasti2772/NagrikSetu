"""Record each resolution review window and its explicit closing policy."""
from alembic import op
import sqlalchemy as sa

revision = "0005_verification_policy"
down_revision = "0004_integrations"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("incident_verification_rounds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("deadline", sa.DateTime(), nullable=False),
        sa.Column("window_hours", sa.Integer(), nullable=False),
        sa.Column("quorum_percent", sa.Integer(), nullable=False),
        sa.Column("eligible_reporters", sa.Integer(), nullable=False),
        sa.Column("approvals_required", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("closed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("reopened_at", sa.DateTime(), nullable=True),
        sa.Column("outcome", sa.String(40), nullable=True),
        sa.Column("review_reason", sa.Text(), nullable=True))
    op.create_index("ix_incident_verification_rounds_incident_id", "incident_verification_rounds", ["incident_id"])

def downgrade():
    op.drop_table("incident_verification_rounds")
