"""Database operations and business-logic helpers.

All multi-step writes (notably order creation) are transactional: a failure
mid-way rolls the whole operation back so stock levels never drift.
"""
from decimal import Decimal

from sqlalchemy import asc, cast, desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .errors import BusinessRuleError, ConflictError, NotFoundError

# --------------------------------------------------------------------------- #
# Shared pagination helper
# --------------------------------------------------------------------------- #

def _build_page(items, total, page, limit):
    pages = max(1, (total + limit - 1) // limit)
    return {"items": items, "total": total, "page": page, "pages": pages, "limit": limit}


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #

_PRODUCT_SORT = {
    "name": models.Product.name,
    "sku": models.Product.sku,
    "price": models.Product.price,
    "quantity": models.Product.quantity,
    "created_at": models.Product.created_at,
    "id": models.Product.id,
}


def list_products(
    db: Session,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    low_stock: bool = False,
    sort_by: str = "name",
    sort_dir: str = "asc",
    page: int = 1,
    limit: int = 20,
    low_stock_threshold: int = 10,
) -> dict:
    where = []
    if search:
        term = f"%{search}%"
        where.append(
            or_(models.Product.name.ilike(term), models.Product.sku.ilike(term))
        )
    if min_price is not None:
        where.append(models.Product.price >= min_price)
    if max_price is not None:
        where.append(models.Product.price <= max_price)
    if low_stock:
        where.append(models.Product.quantity < low_stock_threshold)

    col = _PRODUCT_SORT.get(sort_by, models.Product.name)
    order_expr = desc(col) if sort_dir == "desc" else asc(col)

    total = db.scalar(select(func.count(models.Product.id)).where(*where)) or 0
    items = list(
        db.scalars(
            select(models.Product)
            .where(*where)
            .order_by(order_expr)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    )
    return _build_page(items, total, page, limit)


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

_CUSTOMER_SORT = {
    "full_name": models.Customer.full_name,
    "email": models.Customer.email,
    "created_at": models.Customer.created_at,
    "id": models.Customer.id,
}


def list_customers(
    db: Session,
    search: str | None = None,
    sort_by: str = "full_name",
    sort_dir: str = "asc",
    page: int = 1,
    limit: int = 20,
) -> dict:
    where = []
    if search:
        term = f"%{search}%"
        where.append(
            or_(
                models.Customer.full_name.ilike(term),
                models.Customer.email.ilike(term),
            )
        )

    col = _CUSTOMER_SORT.get(sort_by, models.Customer.full_name)
    order_expr = desc(col) if sort_dir == "desc" else asc(col)

    total = db.scalar(select(func.count(models.Customer.id)).where(*where)) or 0
    items = list(
        db.scalars(
            select(models.Customer)
            .where(*where)
            .order_by(order_expr)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    )
    return _build_page(items, total, page, limit)


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

_ORDER_SORT = {
    "created_at": models.Order.created_at,
    "id": models.Order.id,
    "total_amount": models.Order.total_amount,
    "status": models.Order.status,
}

# Valid status transitions
_TRANSITIONS: dict[str, set[str]] = {
    "placed": {"shipped", "cancelled"},
    "shipped": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


def _order_query_options():
    return [
        selectinload(models.Order.items).selectinload(models.OrderItem.product),
        selectinload(models.Order.customer),
    ]


def _load_order(db: Session, order_id: int) -> models.Order | None:
    return db.scalar(
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(*_order_query_options())
    )


def list_orders(
    db: Session,
    search: str | None = None,
    status: str | None = None,
    customer_id: int | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    limit: int = 20,
) -> dict:
    where = []
    needs_join = False

    if status:
        where.append(models.Order.status == status)
    if customer_id:
        where.append(models.Order.customer_id == customer_id)
    if search:
        needs_join = True
        term = f"%{search}%"
        try:
            oid = int(search)
            where.append(
                or_(
                    models.Order.id == oid,
                    models.Customer.full_name.ilike(term),
                )
            )
        except ValueError:
            where.append(models.Customer.full_name.ilike(term))

    col = _ORDER_SORT.get(sort_by, models.Order.created_at)
    order_expr = desc(col) if sort_dir == "desc" else asc(col)

    count_q = select(func.count(models.Order.id)).where(*where)
    if needs_join:
        count_q = count_q.join(
            models.Customer, models.Order.customer_id == models.Customer.id
        )
    total = db.scalar(count_q) or 0

    data_q = (
        select(models.Order)
        .where(*where)
        .order_by(order_expr)
        .offset((page - 1) * limit)
        .limit(limit)
        .options(*_order_query_options())
    )
    if needs_join:
        data_q = data_q.join(
            models.Customer, models.Order.customer_id == models.Customer.id
        )

    items = list(db.scalars(data_q))
    return _build_page(items, total, page, limit)


def get_order(db: Session, order_id: int) -> models.Order:
    order = _load_order(db, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
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
        unit_price = Decimal(str(product.price))
        line_total = unit_price * qty
        total += line_total
        product.quantity -= qty
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


def update_order_status(db: Session, order_id: int, new_status: str) -> models.Order:
    order = get_order(db, order_id)
    valid = _TRANSITIONS.get(order.status, set())
    if new_status not in valid:
        raise BusinessRuleError(
            f"Cannot transition order from '{order.status}' to '{new_status}'"
        )
    if new_status == "cancelled":
        for item in order.items:
            product = db.get(models.Product, item.product_id)
            if product is not None:
                product.quantity += item.quantity
    order.status = new_status
    db.commit()
    return get_order(db, order_id)


def delete_order(db: Session, order_id: int, restock: bool = True) -> None:
    order = get_order(db, order_id)
    if restock:
        for item in order.items:
            product = db.get(models.Product, item.product_id)
            if product is not None:
                product.quantity += item.quantity
    db.delete(order)
    db.commit()


def list_customer_orders(db: Session, customer_id: int) -> list[models.Order]:
    get_customer(db, customer_id)
    return list(
        db.scalars(
            select(models.Order)
            .where(models.Order.customer_id == customer_id)
            .order_by(models.Order.id.desc())
            .options(*_order_query_options())
        )
    )


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

    status_rows = db.execute(
        select(models.Order.status, func.count(models.Order.id).label("cnt"))
        .group_by(models.Order.status)
    ).all()
    order_status_counts = [{"status": s, "count": c} for s, c in status_rows]

    stock_chart = list(
        db.scalars(
            select(models.Product).order_by(models.Product.quantity.asc()).limit(10)
        )
    )

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_threshold": low_stock_threshold,
        "low_stock_products": low_stock,
        "order_status_counts": order_status_counts,
        "stock_chart": stock_chart,
    }
