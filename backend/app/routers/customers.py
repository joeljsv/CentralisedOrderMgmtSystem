from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["customers"])


def _serialize_order(o) -> schemas.OrderRead:
    return schemas.OrderRead(
        id=o.id,
        customer_id=o.customer_id,
        customer_name=o.customer.full_name if o.customer else None,
        status=o.status,
        total_amount=o.total_amount,
        created_at=o.created_at,
        items=[
            schemas.OrderItemRead(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in o.items
        ],
    )


@router.post("", response_model=schemas.CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db, payload)


@router.get("", response_model=schemas.PaginatedResponse[schemas.CustomerRead])
def list_customers(
    search: Annotated[str | None, Query(max_length=200)] = None,
    sort_by: Annotated[str, Query()] = "full_name",
    sort_dir: Annotated[str, Query(pattern="^(asc|desc)$")] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: Session = Depends(get_db),
):
    result = crud.list_customers(
        db, search=search, sort_by=sort_by, sort_dir=sort_dir, page=page, limit=limit
    )
    return {
        **result,
        "items": [schemas.CustomerRead.model_validate(c) for c in result["items"]],
    }


@router.get("/{customer_id}", response_model=schemas.CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return crud.get_customer(db, customer_id)


@router.get("/{customer_id}/orders", response_model=list[schemas.OrderRead])
def list_customer_orders(customer_id: int, db: Session = Depends(get_db)):
    orders = crud.list_customer_orders(db, customer_id)
    return [_serialize_order(o) for o in orders]


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    crud.delete_customer(db, customer_id)
