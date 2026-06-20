"""Seed a small set of demo data so a freshly deployed app is not empty."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models


def seed_if_empty(db: Session) -> None:
    has_products = db.scalar(select(func.count(models.Product.id))) or 0
    if has_products:
        return

    products = [
        models.Product(name="Wireless Mouse", sku="WM-001", price=24.99, quantity=120),
        models.Product(name="Mechanical Keyboard", sku="KB-002", price=79.50, quantity=45),
        models.Product(name="27in Monitor", sku="MON-027", price=199.00, quantity=8),
        models.Product(name="USB-C Hub", sku="HUB-100", price=39.95, quantity=5),
        models.Product(name="Laptop Stand", sku="LS-200", price=29.00, quantity=60),
    ]
    customers = [
        models.Customer(full_name="Alice Johnson", email="alice@example.com", phone="555-0101"),
        models.Customer(full_name="Bob Smith", email="bob@example.com", phone="555-0102"),
    ]
    db.add_all(products + customers)
    db.commit()
