from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    return crud.dashboard_summary(db, settings.low_stock_threshold)
