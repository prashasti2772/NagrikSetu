"""Baseline for the Phase 2 schema; safely adopts existing installations."""
from alembic import op, context
import sqlalchemy as sa

revision = "0001_phase2"
down_revision = None
branch_labels = None
depends_on = None

LEGACY_COLUMNS = {
    "citizen_id": "INTEGER REFERENCES users(id)",
    "assigned_department_id": "INTEGER REFERENCES departments(id)",
    "assigned_officer_id": "INTEGER REFERENCES users(id)",
    "priority": "VARCHAR(20) NOT NULL DEFAULT 'medium'",
    "resolution_notes": "TEXT", "evidence_url": "VARCHAR(2048)",
    "resolved_at": "TIMESTAMP", "verification_status": "VARCHAR(20) NOT NULL DEFAULT 'pending'",
}

def create_or_adopt(name, *columns, **kwargs):
    if context.is_offline_mode():
        return op.create_table(name, *columns, **kwargs)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if name not in inspector.get_table_names():
        return op.create_table(name, *columns, **kwargs)
    existing = {c["name"] for c in inspector.get_columns(name)}
    expected = {c.name for c in columns if isinstance(c, sa.Column)}
    missing = expected - existing
    if name == "complaints" and missing <= LEGACY_COLUMNS.keys():
        for column in sorted(missing):
            op.execute(sa.text(f"ALTER TABLE complaints ADD COLUMN {column} {LEGACY_COLUMNS[column]}"))
        if "priority" in missing:
            op.execute(sa.text("UPDATE complaints SET priority = severity"))
    elif missing:
        raise RuntimeError(f"Cannot adopt incompatible table {name}: missing required columns")

def create_index_if_missing(name, table, columns, **kwargs):
    if context.is_offline_mode() or name not in {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)}:
        op.create_index(name, table, columns, **kwargs)

def upgrade():
    create_or_adopt('departments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    create_or_adopt('password_otps',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('otp_hash', sa.String(length=64), nullable=False),
    sa.Column('expiry', sa.DateTime(), nullable=False),
    sa.Column('used', sa.Boolean(), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('reset_hash', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    create_index_if_missing(op.f('ix_password_otps_email'), 'password_otps', ['email'], unique=False)
    create_or_adopt('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('employee_id', sa.String(length=100), nullable=True),
    sa.Column('designation', sa.String(length=100), nullable=True),
    sa.Column('department_id', sa.Integer(), nullable=True),
    sa.Column('token_version', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    create_index_if_missing(op.f('ix_users_email'), 'users', ['email'], unique=True)
    create_or_adopt('complaints',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('severity', sa.String(length=20), nullable=False),
    sa.Column('latitude', sa.Float(), nullable=False),
    sa.Column('longitude', sa.Float(), nullable=False),
    sa.Column('address', sa.String(length=500), nullable=False),
    sa.Column('image_url', sa.String(length=2048), nullable=True),
    sa.Column('status', sa.Enum('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'verification_pending', 'reopened', name='complaintstatus', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('assigned_department', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('citizen_id', sa.Integer(), nullable=True),
    sa.Column('assigned_department_id', sa.Integer(), nullable=True),
    sa.Column('assigned_officer_id', sa.Integer(), nullable=True),
    sa.Column('priority', sa.String(length=20), server_default='medium', nullable=False),
    sa.Column('resolution_notes', sa.Text(), nullable=True),
    sa.Column('evidence_url', sa.String(length=2048), nullable=True),
    sa.Column('resolved_at', sa.DateTime(), nullable=True),
    sa.Column('verification_status', sa.String(length=20), server_default='pending', nullable=False),
    sa.ForeignKeyConstraint(['assigned_department_id'], ['departments.id'], ),
    sa.ForeignKeyConstraint(['assigned_officer_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['citizen_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    create_or_adopt('complaint_remarks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('complaint_id', sa.Integer(), nullable=False),
    sa.Column('author_user_id', sa.Integer(), nullable=False),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['author_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    create_index_if_missing(op.f('ix_complaint_remarks_complaint_id'), 'complaint_remarks', ['complaint_id'], unique=False)
    create_or_adopt('complaint_status_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('complaint_id', sa.Integer(), nullable=False),
    sa.Column('old_status', sa.String(length=30), nullable=True),
    sa.Column('new_status', sa.String(length=30), nullable=False),
    sa.Column('changed_by_user_id', sa.Integer(), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['changed_by_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    create_index_if_missing(op.f('ix_complaint_status_history_complaint_id'), 'complaint_status_history', ['complaint_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_complaint_status_history_complaint_id'), table_name='complaint_status_history')
    op.drop_table('complaint_status_history')
    op.drop_index(op.f('ix_complaint_remarks_complaint_id'), table_name='complaint_remarks')
    op.drop_table('complaint_remarks')
    op.drop_table('complaints')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_password_otps_email'), table_name='password_otps')
    op.drop_table('password_otps')
    op.drop_table('departments')
