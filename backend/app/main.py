"""FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import Base, SessionLocal, engine
from .errors import AppError
from .routers import customers, dashboard, orders, products
from .seed import seed_if_empty

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (simple schema init; swap for Alembic if needed).
    Base.metadata.create_all(bind=engine)
    if settings.seed_on_startup:
        with SessionLocal() as db:
            try:
                seed_if_empty(db)
            except Exception:  # seeding must never block startup
                logger.exception("Seeding failed; continuing without demo data")
    yield


app = FastAPI(
    title="Inventory & Order Management System",
    description="REST API for products, customers, orders and dashboard stats.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/", tags=["meta"])
def root():
    return {"service": "oms-api", "docs": "/docs", "health": "/health"}


app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
