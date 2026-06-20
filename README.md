# Centralised Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing
**products, customers, orders and inventory**.

| Layer    | Technology |
|----------|------------|
| Frontend | React (JavaScript) + Vite + Material UI |
| Backend  | Python + FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL |
| Infra    | Docker + Docker Compose, nginx (frontend), gunicorn/uvicorn (backend) |

---

## Table of Contents
1. [Features](#features)
2. [Architecture](#architecture)
3. [Quick Start (Docker Compose)](#quick-start-docker-compose)
4. [Local Development (without Docker)](#local-development-without-docker)
5. [API Reference](#api-reference)
6. [Business Rules](#business-rules)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)
9. [Submission Checklist](#submission-checklist)

---

## Features

**Products** — full CRUD (name, SKU, price, quantity), low-stock indicators.
**Customers** — create, list, view, delete (full name, email, phone).
**Orders** — create multi-line orders, view list/details, cancel (restocks).
**Dashboard** — totals for products/customers/orders + a low-stock table.
**UX** — responsive MUI layout, client + server validation, success/error
snackbars, confirmation dialogs.

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  frontend    │ HTTP │   backend    │ SQL  │  PostgreSQL  │
│ React + MUI  │─────▶│   FastAPI    │─────▶│   (db)       │
│ nginx :80    │      │ gunicorn:8000│      │   :5432      │
└──────────────┘      └──────────────┘      └──────────────┘
   Vercel                 Render                Render PG
```

Backend layout (`backend/app/`):
`main.py` (app + CORS + error handlers), `config.py`, `database.py`,
`models.py`, `schemas.py`, `crud.py` (business logic), `errors.py`,
`seed.py`, and `routers/` (products, customers, orders, dashboard).

---

## Quick Start (Docker Compose)

**Prerequisites:** Docker Desktop (Docker + Compose v2).

```bash
# 1. Clone
git clone <your-repo-url>
cd CentralisedOrderMgmtSystem

# 2. Create your env file (no credentials are committed)
cp .env.example .env        # then edit POSTGRES_PASSWORD etc.

# 3. Build & run all three services
docker compose up --build
```

Then open:
- **Frontend:** http://localhost:5173
- **Backend API docs (Swagger):** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

Demo data is seeded automatically on first run (set `SEED_ON_STARTUP=false`
to disable). Postgres data persists in the named volume `pgdata` across
`docker compose down` / `up`. To wipe it: `docker compose down -v`.

---

## Local Development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
# Point at any Postgres (or sqlite:///./dev.db for a quick local run)
export DATABASE_URL="postgresql+psycopg://oms:oms@localhost:5432/oms"
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

---

## API Reference

Base URL: `http://localhost:8000`. Interactive docs at `/docs`.

### Products
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/products`       | Create a product |
| GET    | `/products`       | List all products |
| GET    | `/products/{id}`  | Get one product |
| PUT    | `/products/{id}`  | Update a product |
| DELETE | `/products/{id}`  | Delete a product |

### Customers
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/customers`      | Create a customer |
| GET    | `/customers`      | List all customers |
| GET    | `/customers/{id}` | Get one customer |
| DELETE | `/customers/{id}` | Delete a customer |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/orders`      | Create an order (multi line-item) |
| GET    | `/orders`      | List all orders |
| GET    | `/orders/{id}` | Get order details |
| DELETE | `/orders/{id}` | Cancel/delete an order (restocks) |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Totals + low-stock products |

**Example — create an order**
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "items": [{"product_id": 1, "quantity": 2},
                                    {"product_id": 3, "quantity": 1}]}'
```
The backend validates stock, decrements inventory, and computes `total_amount`.

---

## Business Rules

| Rule | Enforcement |
|------|-------------|
| Product SKU unique | DB unique index → `409 Conflict` |
| Customer email unique | DB unique index → `409 Conflict` |
| Product quantity never negative | DB CHECK + validation (`422`) |
| Cannot order more than stock | per-item check → `400 Bad Request` |
| Order reduces stock automatically | atomic transaction in `crud.create_order` |
| Total computed by backend | server sums `unit_price × qty` (client value ignored) |
| Cancelling an order restores stock | `crud.delete_order(restock=True)` |
| Request validation | Pydantic v2 schemas (`422` on bad input) |

HTTP status codes used: `200`, `201`, `204`, `400`, `404`, `409`, `422`.

---

## Environment Variables

**Root `.env`** (docker-compose) — see [`.env.example`](.env.example):
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `FRONTEND_ORIGIN`,
`LOW_STOCK_THRESHOLD`, `SEED_ON_STARTUP`, `VITE_API_URL`.

**Backend** — see [`backend/.env.example`](backend/.env.example):
`DATABASE_URL` (accepts `postgres://`, `postgresql://`, or
`postgresql+psycopg://` — normalized automatically), `FRONTEND_ORIGIN`,
`LOW_STOCK_THRESHOLD`, `SEED_ON_STARTUP`.

**Frontend** — see [`frontend/.env.example`](frontend/.env.example):
`VITE_API_URL` (inlined at build time).

> No credentials are hardcoded anywhere — all come from environment variables.

---

## Deployment

### Backend → Render (Docker + free Postgres)
1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo. [`render.yaml`](render.yaml)
   provisions the `oms-backend` Docker web service and a free `oms-db` Postgres
   instance, wiring `DATABASE_URL` automatically.
3. After the frontend is deployed, set `FRONTEND_ORIGIN` on the backend service
   to the Vercel URL (e.g. `https://your-app.vercel.app`) so CORS allows it.
4. Backend will be live at `https://<service>.onrender.com` (`/docs`, `/health`).

### Backend image → Docker Hub
```bash
docker build -t <dockerhub-user>/oms-backend:latest ./backend
docker login
docker push <dockerhub-user>/oms-backend:latest
```

### Frontend → Vercel
1. **New Project → import** the repo, set **Root Directory** to `frontend`.
2. Build command `npm run build`, output directory `dist` (auto-detected).
3. Add env var `VITE_API_URL` = your live Render backend URL.
4. Deploy → live at `https://<app>.vercel.app`.

> Order matters: deploy backend → deploy frontend with its URL → set the
> backend's `FRONTEND_ORIGIN` to the frontend URL → redeploy backend.

---

## Submission Checklist

- [ ] **GitHub repository:** `<repo-url>`
- [ ] **Docker Hub backend image:** `https://hub.docker.com/r/<user>/oms-backend`
- [ ] **Live frontend URL (Vercel):** `<url>`
- [ ] **Live backend API URL (Render):** `<url>` (verify `/docs` + `/health`)
