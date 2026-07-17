"""seed vocational profiles and questions

Revision ID: cd11d45b33a2
Revises: c74771156e62
Create Date: 2026-07-16 22:03:50.082809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd11d45b33a2'
down_revision: Union[str, None] = 'c74771156e62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


vocational_profiles_table = sa.table(
    "vocational_profiles",
    sa.column("id", sa.Integer),
    sa.column("code", sa.String),
    sa.column("name", sa.String),
    sa.column("description", sa.Text),
)

questions_table = sa.table(
    "questions",
    sa.column("id", sa.Integer),
    sa.column("order", sa.Integer),
    sa.column("text", sa.Text),
    sa.column("profile_id", sa.Integer),
)

PROFILES = [
    {
        "id": 1,
        "code": "ANALITICO",
        "name": "Analítico-Científico",
        "description": "Disfrutas investigar, resolver problemas complejos y trabajar con datos o teorías.",
    },
    {
        "id": 2,
        "code": "CREATIVO",
        "name": "Creativo-Artístico",
        "description": "Te expresas mejor a través del diseño, el arte o la generación de ideas originales.",
    },
    {
        "id": 3,
        "code": "SOCIAL",
        "name": "Social-Comunicativo",
        "description": "Te motiva ayudar, enseñar o comunicarte con otras personas.",
    },
    {
        "id": 4,
        "code": "TECNICO",
        "name": "Técnico-Práctico",
        "description": "Prefieres construir, reparar o trabajar con herramientas y tecnología de forma práctica.",
    },
    {
        "id": 5,
        "code": "ORGANIZACIONAL",
        "name": "Organizacional-Administrativo",
        "description": "Te sientes cómodo liderando, organizando procesos o gestionando negocios.",
    },
]

# 20 preguntas, 4 por perfil, intercaladas en el orden de presentación
# (ANALITICO, CREATIVO, SOCIAL, TECNICO, ORGANIZACIONAL) x4 para que preguntas
# consecutivas no revelen a qué perfil pertenecen.
QUESTIONS = [
    (1, "Disfruto resolver problemas lógicos o acertijos que requieren pensar paso a paso.", 1),
    (2, "Disfruto crear cosas nuevas, ya sea diseños, historias o soluciones originales.", 2),
    (3, "Disfruto ayudar a otras personas a resolver sus problemas o dudas.", 3),
    (4, "Disfruto armar, reparar o construir cosas con mis manos.", 4),
    (5, "Disfruto planear y organizar actividades o proyectos.", 5),
    (6, "Me interesa entender cómo y por qué funcionan las cosas, más allá de solo usarlas.", 1),
    (7, "Me gusta expresar mis ideas a través de imágenes, música, escritura o diseño.", 2),
    (8, "Me resulta fácil ponerme en el lugar de otras personas y entender lo que sienten.", 3),
    (9, "Me interesa entender cómo funcionan las máquinas, dispositivos o sistemas técnicos.", 4),
    (10, "Me resulta natural asumir el liderazgo en un grupo.", 5),
    (11, "Prefiero tomar decisiones basándome en datos y evidencia antes que en intuición.", 1),
    (12, "Prefiero encontrar mi propia forma de hacer las cosas en vez de seguir un método fijo.", 2),
    (13, "Prefiero trabajar en equipo antes que trabajar solo.", 3),
    (14, "Prefiero aprender haciendo (práctica) antes que solo leyendo teoría.", 4),
    (15, "Me interesa cómo se administran los recursos y el tiempo en un proyecto o negocio.", 5),
    (16, "Me gusta investigar a fondo un tema hasta entenderlo completamente.", 1),
    (17, "Me siento cómodo proponiendo ideas poco convencionales.", 2),
    (18, "Me interesa enseñar o explicar temas a otras personas.", 3),
    (19, "Me siento cómodo usando herramientas, software técnico o equipos especializados.", 4),
    (20, "Prefiero tener un plan claro y estructurado antes de empezar una tarea.", 5),
]


def upgrade() -> None:
    op.bulk_insert(vocational_profiles_table, PROFILES)
    op.bulk_insert(
        questions_table,
        [{"id": id_, "order": id_, "text": text, "profile_id": profile_id} for id_, text, profile_id in QUESTIONS],
    )


def downgrade() -> None:
    op.execute(questions_table.delete())
    op.execute(vocational_profiles_table.delete())
