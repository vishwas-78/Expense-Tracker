from datetime import UTC, date as DateType, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "expense_tracker_users"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    email: str = Field(max_length=180, index=True, unique=True)
    name: str = Field(max_length=120)
    password_hash: str = Field(max_length=300)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Expense(SQLModel, table=True):
    __tablename__ = "expense_tracker_expenses"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str | None = Field(default=None, foreign_key="expense_tracker_users.id", index=True)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    description: str = Field(max_length=180, index=True)
    category: str = Field(max_length=60, index=True)
    date: DateType = Field(index=True)
    payment_method: str = Field(default="Other", max_length=40)
    note: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Income(SQLModel, table=True):
    __tablename__ = "expense_tracker_income"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="expense_tracker_users.id", index=True)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    source: str = Field(max_length=180, index=True)
    category: str = Field(max_length=60, index=True)
    date: DateType = Field(index=True)
    note: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Budget(SQLModel, table=True):
    __tablename__ = "expense_tracker_budgets"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="expense_tracker_users.id", index=True)
    category: str = Field(max_length=60, index=True)
    month: str = Field(max_length=7, index=True)
    limit_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Subscription(SQLModel, table=True):
    __tablename__ = "expense_tracker_subscriptions"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="expense_tracker_users.id", index=True)
    name: str = Field(max_length=120)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    billing_cycle: str = Field(default="monthly", max_length=20)
    next_payment: DateType = Field(index=True)
    category: str = Field(default="Subscriptions", max_length=60)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SplitBill(SQLModel, table=True):
    __tablename__ = "expense_tracker_split_bills"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="expense_tracker_users.id", index=True)
    title: str = Field(max_length=160)
    total_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    people_count: int = Field(default=2, nullable=False)
    your_share: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    status: str = Field(default="open", max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))