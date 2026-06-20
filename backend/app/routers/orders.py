from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


def _serialize(order: models.Order) -> schemas.OrderRead:
    """Flatten relationship data (customer/product names) into the response."""
    return schemas.OrderRead(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.full_name if order.customer else None,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=[
            schemas.OrderItemRead(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in order.items
        ],
    )


@router.post("", response_model=schemas.OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    return _serialize(crud.create_order(db, payload))


@router.get("", response_model=schemas.PaginatedResponse[schemas.OrderRead])
def list_orders(
    search: Annotated[str | None, Query(max_length=200)] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    customer_id: Annotated[int | None, Query(ge=1)] = None,
    sort_by: Annotated[str, Query()] = "created_at",
    sort_dir: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: Session = Depends(get_db),
):
    result = crud.list_orders(
        db,
        search=search,
        status=status_filter,
        customer_id=customer_id,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit,
    )
    return {**result, "items": [_serialize(o) for o in result["items"]]}


@router.get("/{order_id}", response_model=schemas.OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return _serialize(crud.get_order(db, order_id))


@router.patch("/{order_id}/status", response_model=schemas.OrderRead)
def update_order_status(
    order_id: int, payload: schemas.StatusUpdate, db: Session = Depends(get_db)
):
    return _serialize(crud.update_order_status(db, order_id, payload.status))


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    crud.delete_order(db, order_id)
