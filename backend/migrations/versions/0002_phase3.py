"""Notifications, evidence metadata and separate intelligence suggestions."""
from alembic import op
import sqlalchemy as sa
revision = "0002_phase3"
down_revision = "0001_phase2"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('complaint_evidence',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('complaint_id', sa.Integer(), nullable=False),
    sa.Column('image_url', sa.String(length=2048), nullable=False),
    sa.Column('evidence_type', sa.String(length=30), nullable=False),
    sa.Column('uploaded_at', sa.DateTime(), nullable=False),
    sa.Column('uploaded_by', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_complaint_evidence_complaint_id'), 'complaint_evidence', ['complaint_id'], unique=False)
    op.create_table('complaint_suggestions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('complaint_id', sa.Integer(), nullable=False),
    sa.Column('suggested_category', sa.String(length=100), nullable=False),
    sa.Column('suggested_priority', sa.String(length=20), nullable=False),
    sa.Column('confidence', sa.Double(), nullable=False),
    sa.Column('recommended_department_id', sa.Integer(), nullable=True),
    sa.Column('model_version', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ),
    sa.ForeignKeyConstraint(['recommended_department_id'], ['departments.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('complaint_id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('complaint_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_table('complaint_suggestions')
    op.drop_index(op.f('ix_complaint_evidence_complaint_id'), table_name='complaint_evidence')
    op.drop_table('complaint_evidence')
