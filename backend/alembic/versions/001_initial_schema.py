# FILE: backend/alembic/versions/001_initial_schema.py
# ROLE: Creates all CityPulse tables and indexes from scratch.

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Enable PostGIS extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- cities ---
    op.create_table(
        'cities',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('state', sa.Text(), nullable=True),
        sa.Column('api_type', sa.Text(), nullable=True),
        sa.Column('api_base_url', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), server_default='true', nullable=False),
    )

    # --- clusters ---
    op.create_table(
        'clusters',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('city_id', sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('cities.id'), nullable=True),
        sa.Column('category', sa.Text(), nullable=True),
        sa.Column('centroid', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('complaint_count', sa.Integer(), server_default='0'),
        sa.Column('oldest_complaint_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('avg_resolution_days', sa.Float(), nullable=True),
        sa.Column('escalated', sa.Boolean(), server_default='false'),
    )

    # --- users ---
    op.create_table(
        'users',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('email', sa.Text(), nullable=False, unique=True),
        sa.Column('zip_code', sa.Text(), nullable=True),
        sa.Column('neighborhood', sa.Text(), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
        sa.Column('digest_opt_in', sa.Boolean(), server_default='true'),
        sa.Column('verified', sa.Boolean(), server_default='false'),
        sa.Column('verify_token', sa.Text(), nullable=True),
    )

    # --- complaints ---
    op.create_table(
        'complaints',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('city_id', sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('cities.id'), nullable=True),
        sa.Column('external_id', sa.Text(), nullable=True),
        sa.Column('category', sa.Text(), nullable=True),
        sa.Column('subcategory', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default='open'),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('zip_code', sa.Text(), nullable=True),
        sa.Column('neighborhood', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('filed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_days', sa.Integer(), nullable=True),
        sa.Column('source', sa.Text(), server_default='city_api_sync'),
        sa.Column('cluster_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reporter_user_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )

    # --- escalations ---
    op.create_table(
        'escalations',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('cluster_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('council_member_name', sa.Text(), nullable=True),
        sa.Column('council_member_email', sa.Text(), nullable=True),
        sa.Column('report_url', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('complaint_count', sa.Integer(), nullable=True),
    )

    # --- resolutions ---
    op.create_table(
        'resolutions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('complaint_id', sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('complaints.id'), nullable=True),
        sa.Column('confirmed_by_user', sa.Boolean(), nullable=True),
        sa.Column('disputed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_note', sa.Text(), nullable=True),
    )

    # --- indexes (all after tables are created) ---
    op.execute("CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints USING GIST (location)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_complaints_composite ON complaints (city_id, category, status, filed_at DESC)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_city_external ON complaints (city_id, external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_clusters_centroid ON clusters USING GIST (centroid)")


def downgrade():
    op.drop_table('resolutions')
    op.drop_table('escalations')
    op.drop_table('complaints')
    op.drop_table('users')
    op.drop_table('clusters')
    op.drop_table('cities')