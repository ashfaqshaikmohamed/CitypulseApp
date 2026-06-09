# CityPulse — Civic Accountability Platform

CityPulse is a civic accountability web application that syncs with city 311 APIs, runs Google Gemini Vision AI on citizen photo reports, and clusters nearby complaints into action groups for civic advocacy.

---

## Technical Stack

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, MapLibre GL JS (free, open source OSM layout), SWR (data fetching), Zustand (global state).
* **Backend**: FastAPI (Python 3.11), SQLAlchemy (Async), Alembic (database schema migrations), Celery with Redis (task workers).
* **Database**: PostgreSQL with PostGIS extensions.
* **Storage**: Cloudflare R2 (S3-compatible, 10GB free tier).
* **AI Engine**: Google Gemini 1.5 Flash (for image categorization & description validation).

---

## Phase 1 Setup Instructions (Development Environment)

Follow these precise steps to spin up the local development environment inside Docker Compose:

### Step 1: Set Up Credentials
Copy the example environment settings file to create your local environments. Fill in the keys as requested.
```bash
cp .env.example .env
```

### Step 2: Spin Up Services
Launch the PostgreSQL/PostGIS, Redis, FastAPI backend, Celery worker, and Next.js frontend services.
```bash
docker-compose up --build -d
```

### Step 3: Run Database Migrations
Execute Alembic migrations to build out our Postgres tables, keys, and spatial indices securely inside the running database container.
```bash
docker-compose exec backend alembic upgrade head
```

### Step 4: Seed Supported Cities
Seed the cities table with the original supported city (New York City API setup).
```bash
docker-compose exec backend python scripts/seed_cities.py
```

### Step 5: (Alternative) Standard Local Frontend Setup
If you want to run the front-end directly on your host machine outside of Docker:
```bash
cd frontend
npm install
npm run dev
```

### Step 6: Verify active services
Open your web browser of choice and visit:
* **Frontend Application**: [http://localhost:3000](http://localhost:3000) (Rendering the responsive loading screen)
* **Backend OpenAPI Specification**: [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive FastAPI docs)
