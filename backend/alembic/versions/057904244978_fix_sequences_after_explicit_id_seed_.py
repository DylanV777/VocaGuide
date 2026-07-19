"""fix sequences after explicit-id seed inserts

Revision ID: 057904244978
Revises: 74f8e78b7b31
Create Date: 2026-07-19 12:05:33.326266

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '057904244978'
down_revision: Union[str, None] = '74f8e78b7b31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Las migraciones cd11d45b33a2 (perfiles + preguntas) y 74f8e78b7b31 (carreras)
# insertaron filas con ids explícitos vía op.bulk_insert, lo cual NO avanza la
# secuencia autoincremental de PostgreSQL asociada a cada tabla. Como resultado,
# la secuencia queda en 1 mientras ya existen filas con ids hasta 20, y el primer
# INSERT hecho por la aplicación (sin id explícito) choca con una fila existente
# ("duplicate key value violates unique constraint"). Esta migración sincroniza
# cada secuencia con el máximo id realmente presente en su tabla.
TABLES_WITH_EXPLICIT_ID_SEEDS = ["vocational_profiles", "questions", "careers"]


def upgrade() -> None:
    for table in TABLES_WITH_EXPLICIT_ID_SEEDS:
        op.execute(
            f"SELECT setval('{table}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM {table}))"
        )


def downgrade() -> None:
    pass
