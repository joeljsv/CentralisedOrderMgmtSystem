from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=schemas.CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db, payload)


@router.get("", response_model=list[schemas.CustomerRead])
def list_customers(db: Session = Depends(get_db)):
    return crud.list_customers(db)


@router.get("/{customer_id}", response_model=schemas.CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return crud.get_customer(db, customer_id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    crud.delete_customer(db, customer_id)
