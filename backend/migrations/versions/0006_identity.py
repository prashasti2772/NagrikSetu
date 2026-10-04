"""Optional identity outcome metadata; no identity documents or identifiers."""
from alembic import op
import sqlalchemy as sa

revision = "0006_identity"
down_revision = "0005_verification_policy"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("identity_status", sa.String(30), nullable=False, server_default="unverified"))
    op.add_column("users", sa.Column("identity_provider", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("identity_verified_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "identity_verified_at")
    op.drop_column("users", "identity_provider")
    op.drop_column("users", "identity_status")
