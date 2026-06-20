# Centralised Order Management System

A full-stack inventory and order management application built with FastAPI, React, and PostgreSQL. Runs fully containerised with Docker Compose.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Material UI |
| Backend | Python + FastAPI + SQLAlchemy |
| Database | PostgreSQL |
| Container | Docker + Docker Compose + nginx |

## Features

- Product inventory management with low-stock alerts
- Customer management with order history
- Order creation with multiple line items and status workflow (placed → shipped → delivered / cancelled)
- Dashboard with stock level and order status charts
- Search, filter, sort, and pagination on all list views
- CSV export and print view for orders

## Quick Start

Requires Docker and Docker Compose.

```bash
cp .env.example .env        # adjust values if needed
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `VITE_API_URL` | Backend URL (for frontend build) |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the backend |
| `SEED_ON_STARTUP` | Seed demo data on first run (`true`/`false`) |

## Deployment

- Backend: Render (Docker Web Service)
- Frontend: Vercel
- Database: Render PostgreSQL

See deployment steps in the project documentation.
