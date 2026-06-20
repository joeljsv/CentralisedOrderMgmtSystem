from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, payload)


@router.get("", response_model=schemas.PaginatedResponse[schemas.ProductRead])
def list_products(
    search: Annotated[str | None, Query(max_length=200)] = None,
    min_price: Annotated[float | None, Query(ge=0)] = None,
    max_price: Annotated[float | None, Query(ge=0)] = None,
    low_stock: bool = False,
    sort_by: Annotated[str, Query()] = "name",
    sort_dir: Annotated[str, Query(pattern="^(asc|desc)$")] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=500)] = 20,
    db: Session = Depends(get_db),
):
    result = crud.list_products(
        db,
        search=search,
        min_price=min_price,
        max_price=max_price,
        low_stock=low_stock,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit,
        low_stock_threshold=settings.low_stock_threshold,
    )
    return {
        **result,
        "items": [schemas.ProductRead.model_validate(p) for p in result["items"]],
    }


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return crud.get_product(db, product_id)


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    return crud.update_product(db, product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    crud.delete_product(db, product_id)
