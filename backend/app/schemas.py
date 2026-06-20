"""Pydantic v2 request/response schemas with validation."""
from datetime import datetime
from decimal import Decimal
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

T = TypeVar("T")


# --------------------------------------------------------------------------- #
# Pagination
# --------------------------------------------------------------------------- #
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    pages: int
    limit: int


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)
    quantity: int = Field(..., ge=0)

    @field_validator("name", "sku")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    sku: str | None = Field(None, min_length=1, max_length=100)
    price: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=2)
    quantity: int | None = Field(None, ge=0)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --------------------------------------------------------------------------- #
# Customer
# --------------------------------------------------------------------------- #
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(None, max_length=50)

    @field_validator("full_name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: str | None = None
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer_name: str | None = None
    status: str
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemRead]


class StatusUpdate(BaseModel):
    status: Literal["shipped", "delivered", "cancelled"]


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class LowStockProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sku: str
    quantity: int


class OrderStatusCount(BaseModel):
    status: str
    count: int


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_threshold: int
    low_stock_products: list[LowStockProduct]
    order_status_counts: list[OrderStatusCount]
    stock_chart: list[LowStockProduct]
