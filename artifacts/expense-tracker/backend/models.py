from datetime import UTC, date as DateType, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel


class Expense(SQLModel, table=True):
    __tablename__ = "expense_tracker_expenses"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    description: str = Field(max_length=180, index=True)
    category: str = Field(max_length=60, index=True)
    date: DateType = Field(index=True)
    payment_method: str = Field(default="Other", max_length=40)
    note: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))