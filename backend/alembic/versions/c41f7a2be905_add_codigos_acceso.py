"""Add codigos_acceso

Revision ID: c41f7a2be905
Revises: 58a510313b9a
Create Date: 2026-09-29 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c41f7a2be905'
down_revision: Union[str, None] = '58a510313b9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'codigos_acceso',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('codigo_hash', sa.String(), nullable=False),
        sa.Column('creado_at', sa.DateTime(), nullable=False),
        sa.Column('expira_at', sa.DateTime(), nullable=False),
        sa.Column('usado', sa.Boolean(), nullable=False),
        sa.Column('intentos', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_codigos_acceso_id'), 'codigos_acceso', ['id'], unique=False)
    # Se consulta siempre por fecha: el último código emitido y cuántos van
    # en la última hora.
    op.create_index('ix_codigos_acceso_creado_at', 'codigos_acceso', ['creado_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_codigos_acceso_creado_at', table_name='codigos_acceso')
    op.drop_index(op.f('ix_codigos_acceso_id'), table_name='codigos_acceso')
    op.drop_table('codigos_acceso')
