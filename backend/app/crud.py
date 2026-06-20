"""Database operations and business-logic helpers.

All multi-step writes (notably order creation) are transactional: a failure
mid-way rolls the whole operation back so stock levels never drift.
"""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .errors import BusinessRuleError, ConflictError, NotFoundError


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
def list_products(db: Session) -> list[models.Product]:
    return list(db.scalars(select(models.Product).order_by(models.Product.id)))


def get_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    product = models.Product(**data.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A product with SKU '{data.sku}' already exists")
    db.refresh(product)
    return product


def update_product(
    db: Session, product_id: int, data: schemas.ProductUpdate
) -> models.Product:
    product = get_product(db, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A product with SKU '{data.sku}' already exists")
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    db.delete(product)
    db.commit()


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
def list_customers(db: Session) -> list[models.Customer]:
    return list(db.scalars(select(models.Customer).order_by(models.Customer.id)))


def get_customer(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise NotFoundError(f"Customer {customer_id} not found")
    return customer


def create_customer(db: Session, data: schemas.CustomerCreate) -> models.Customer:
    customer = models.Customer(**data.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A customer with email '{data.email}' already exists")
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    db.delete(customer)
    db.commit()


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
def _load_order(db: Session, order_id: int) -> models.Order | None:
    return db.scalar(
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(
            selectinload(models.Order.items).selectinload(models.OrderItem.product),
            selectinload(models.Order.customer),
        )
    )


def list_orders(db: Session) -> list[models.Order]:
    return list(
        db.scalars(
            select(models.Order)
            .order_by(models.Order.id.desc())
            .options(
                selectinload(models.Order.items).selectinload(models.OrderItem.product),
                selectinload(models.Order.customer),
            )
        )
    )


def get_order(db: Session, order_id: int) -> models.Order:
    order = _load_order(db, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
    """Create an order, validating stock and decrementing inventory atomically.

    Business rules enforced here:
      * customer must exist (404 otherwise)
      * every product must exist (404 otherwise)
      * inventory must be sufficient for each line (400 otherwise)
      * stock is decremented as the order is placed
      * total_amount is computed by the backend from current product prices
    """
    customer = db.get(models.Customer, data.customer_id)
    if customer is None:
        raise NotFoundError(f"Customer {data.customer_id} not found")

    # Merge duplicate product lines so stock checks see the true requested total.
    requested: dict[int, int] = {}
    for item in data.items:
        requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity

    order = models.Order(customer_id=customer.id, status="placed")
    total = Decimal("0")

    for product_id, qty in requested.items():
        product = db.get(models.Product, product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        if product.quantity < qty:
            raise BusinessRuleError(
                f"Insufficient stock for '{product.sku}': "
                f"requested {qty}, available {product.quantity}"
            )
        unit_price = Decimal(product.price)
        line_total = unit_price * qty
        total += line_total
        product.quantity -= qty  # decrement inventory
        order.items.append(
            models.OrderItem(
                product_id=product.id,
                quantity=qty,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    order.total_amount = total
    db.add(order)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise BusinessRuleError("Order could not be completed due to a data conflict")

    return get_order(db, order.id)


def delete_order(db: Session, order_id: int, restock: bool = True) -> None:
    """Cancel/delete an order. By default restores stock for each line item."""
    order = get_order(db, order_id)
    if restock:
        for item in order.items:
            product = db.get(models.Product, item.product_id)
            if product is not None:
                product.quantity += item.quantity
    db.delete(order)
    db.commit()


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
def dashboard_summary(db: Session, low_stock_threshold: int) -> dict:
    total_products = db.scalar(select(func.count(models.Product.id))) or 0
    total_customers = db.scalar(select(func.count(models.Customer.id))) or 0
    total_orders = db.scalar(select(func.count(models.Order.id))) or 0
    low_stock = list(
        db.scalars(
            select(models.Product)
            .where(models.Product.quantity < low_stock_threshold)
            .order_by(models.Product.quantity)
        )
    )
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_threshold": low_stock_threshold,
        "low_stock_products": low_stock,
    }
