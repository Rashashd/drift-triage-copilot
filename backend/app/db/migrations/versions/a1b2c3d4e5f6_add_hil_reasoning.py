"""add reasoning to hil_inbox

Revision ID: a1b2c3d4e5f6
Revises: 3d9dd5fcc390
Create Date: 2026-05-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3d9dd5fcc390"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("hil_inbox", sa.Column("reasoning", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("hil_inbox", "reasoning")
