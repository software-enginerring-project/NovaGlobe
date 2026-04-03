"""add password_hash to users

Revision ID: a1f4d2c9b8e7
Revises: dc0c7026d4ea
Create Date: 2026-04-04 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1f4d2c9b8e7"
down_revision = "dc0c7026d4ea"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("password_hash")
