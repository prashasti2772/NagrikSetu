"""Use the same sanitized URL handling and TLS settings as the application."""
from alembic import context
from sqlalchemy import DateTime
from app.core.config import settings
from app.db.database import Base, build_engine
from app.models import complaint, domain

config = context.config
target_metadata = Base.metadata

def compare_column_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    # The Phase 2 additive upgrader used TIMESTAMP while create_all used DATETIME.
    # Both have the same naive UTC storage semantics under SQLite.
    if context.dialect.name == "sqlite" and isinstance(inspected_type, DateTime) and isinstance(metadata_type, DateTime):
        return False
    return None

def run(connection):
    context.configure(connection=connection, target_metadata=target_metadata,
                      render_as_batch=connection.dialect.name == "sqlite", compare_type=compare_column_type)
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    # SQL output is for a NEW database. Existing installations require online inspection.
    engine = build_engine(settings.database_url)
    context.configure(dialect_name=engine.dialect.name, target_metadata=target_metadata,
                      literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()
    engine.dispose()
else:
    connection = config.attributes.get("connection")
    if connection is not None:
        run(connection)
    else:
        engine = build_engine(settings.database_url)
        with engine.connect() as connection:
            run(connection)
        engine.dispose()
