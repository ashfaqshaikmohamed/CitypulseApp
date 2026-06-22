# 🏙️ CityPulse

A civic intelligence platform that turns scattered, unstructured resident complaints into clear, actionable insights for city departments — in real time.

## Why CityPulse?

City agencies receive tens of thousands of complaints a month — potholes, broken streetlights, illegal dumping — submitted as raw text and photos with no structure. CityPulse ingests this flood of data, automatically classifies it, geolocates it, and routes it to the right department, without a human ever having to manually sort through it.

## ✨ Features

- **High-throughput ingestion** — handles 50,000+ complaint records without blocking or slowing down
- **AI-powered photo triage** — automatically classifies and routes resident-submitted images using Gemini 1.5 Flash Vision
- **Geospatial clustering** — groups complaints by location to reveal patterns and hotspots across the city
- **Async, non-blocking architecture** — background task processing means the system stays responsive under load
- **Fault-isolated microservices** — each service runs independently, so one failure doesn't take down the platform

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI |
| Task Queue | Celery + Redis |
| Database | PostgreSQL + PostGIS |
| AI / Vision | Gemini 1.5 Flash Vision |
| Infrastructure | Docker (8-service architecture) |

## ⚙️ How It Works

1. **Complaint ingestion** — incoming reports (text + photos) are accepted by an async FastAPI service
2. **Background processing** — a Celery/Redis task queue handles classification and analysis without blocking new submissions
3. **AI photo classification** — Gemini 1.5 Flash Vision reviews submitted images, identifies the issue, and tags the relevant city department
4. **Geospatial clustering** — a PostGIS-powered engine groups complaints by location to surface patterns in real time
5. **Routing & insight delivery** — structured, actionable reports are routed to the appropriate department

```
Resident Report → Async Ingestion (FastAPI) → Task Queue (Celery/Redis) → AI Classification (Gemini Vision) → Geospatial Clustering (PostGIS) → Department Routing
```

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/citypulse.git
cd citypulse
docker-compose up --build
```

The frontend will be available at `http://localhost:3000`, with the FastAPI backend running behind it.

## 🧩 Architecture

CityPulse runs as an 8-service Dockerized microservice architecture, isolating ingestion, task processing, AI classification, geospatial analysis, and the frontend from one another for resilience and independent scaling.

## 📄 License

MIT
