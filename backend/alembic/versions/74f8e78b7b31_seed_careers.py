"""seed careers

Revision ID: 74f8e78b7b31
Revises: 9a0a5efda580
Create Date: 2026-07-17 17:34:50.858102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74f8e78b7b31'
down_revision: Union[str, None] = '9a0a5efda580'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


careers_table = sa.table(
    "careers",
    sa.column("id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("description", sa.Text),
    sa.column("profile_id", sa.Integer),
)

# 4 carreras por cada uno de los 5 perfiles vocacionales (ids 1-5, ver
# cd11d45b33a2_seed_vocational_profiles_and_questions.py): 1=ANALITICO,
# 2=CREATIVO, 3=SOCIAL, 4=TECNICO, 5=ORGANIZACIONAL.
CAREERS = [
    # ANALITICO
    (1, "Ingeniería de Sistemas", "Diseña y desarrolla software y sistemas de información para resolver problemas complejos.", 1),
    (2, "Ciencia de Datos", "Analiza grandes volúmenes de datos para extraer patrones y apoyar la toma de decisiones.", 1),
    (3, "Física", "Estudia las leyes fundamentales que rigen el universo mediante la observación y la experimentación.", 1),
    (4, "Matemáticas", "Investiga estructuras abstractas y modelos que explican fenómenos naturales y sociales.", 1),
    # CREATIVO
    (5, "Diseño Gráfico", "Crea piezas visuales que comunican ideas a través de la imagen, el color y la tipografía.", 2),
    (6, "Comunicación Audiovisual", "Produce contenido en video, cine y medios digitales para contar historias.", 2),
    (7, "Arquitectura", "Diseña espacios y edificaciones que combinan funcionalidad y estética.", 2),
    (8, "Bellas Artes", "Explora la expresión artística a través de la pintura, la escultura y otras disciplinas.", 2),
    # SOCIAL
    (9, "Psicología", "Estudia el comportamiento humano para ayudar a las personas a mejorar su bienestar.", 3),
    (10, "Trabajo Social", "Interviene en comunidades y familias para mejorar sus condiciones de vida.", 3),
    (11, "Licenciatura en Educación", "Forma y acompaña procesos de aprendizaje en niños, jóvenes o adultos.", 3),
    (12, "Enfermería", "Brinda cuidado directo a la salud de las personas en distintos contextos clínicos.", 3),
    # TECNICO
    (13, "Ingeniería Mecánica", "Diseña, construye y mantiene máquinas y sistemas mecánicos.", 4),
    (14, "Ingeniería Electrónica", "Desarrolla dispositivos y sistemas electrónicos para diversas aplicaciones.", 4),
    (15, "Técnico en Sistemas", "Instala, configura y da soporte a equipos y redes informáticas.", 4),
    (16, "Ingeniería Industrial", "Optimiza procesos productivos combinando tecnología y trabajo práctico.", 4),
    # ORGANIZACIONAL
    (17, "Administración de Empresas", "Planifica y dirige los recursos de una organización para alcanzar sus objetivos.", 5),
    (18, "Contaduría Pública", "Gestiona y controla la información financiera de personas y organizaciones.", 5),
    (19, "Economía", "Analiza cómo se producen, distribuyen y consumen los recursos en la sociedad.", 5),
    (20, "Negocios Internacionales", "Gestiona relaciones comerciales y estrategias entre empresas de distintos países.", 5),
]


def upgrade() -> None:
    op.bulk_insert(
        careers_table,
        [
            {"id": id_, "name": name, "description": description, "profile_id": profile_id}
            for id_, name, description, profile_id in CAREERS
        ],
    )


def downgrade() -> None:
    op.execute(careers_table.delete())
