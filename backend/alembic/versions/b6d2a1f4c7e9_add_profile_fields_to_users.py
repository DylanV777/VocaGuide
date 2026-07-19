"""add profile fields to users (first_name, last_name, country, gender)

Revision ID: b6d2a1f4c7e9
Revises: 057904244978
Create Date: 2026-07-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6d2a1f4c7e9'
down_revision: Union[str, None] = '057904244978'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('country', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('gender', sa.String(length=20), nullable=True))
    op.create_check_constraint('ck_users_gender', 'users', "gender IN ('hombre', 'mujer')")


def downgrade() -> None:
    op.drop_constraint('ck_users_gender', 'users', type_='check')
    op.drop_column('users', 'gender')
    op.drop_column('users', 'country')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
