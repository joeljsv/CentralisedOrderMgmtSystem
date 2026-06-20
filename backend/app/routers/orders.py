from fastapi import APIRouter, Depends, status
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


@router.get("", response_model=list[schemas.OrderRead])
def list_orders(db: Session = Depends(get_db)):
    return [_serialize(o) for o in crud.list_orders(db)]


@router.get("/{order_id}", response_model=schemas.OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return _serialize(crud.get_order(db, order_id))


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    crud.delete_order(db, order_id)
