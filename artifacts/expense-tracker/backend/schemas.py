from datetime import date as DateType, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=180)
    category: str = Field(min_length=1, max_length=60)
    date: DateType
    payment_method: str = Field(default="Other", max_length=40)
    note: str = Field(default="", max_length=500)


class ExpenseUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    description: str | None = Field(default=None, min_length=1, max_length=180)
    category: str | None = Field(default=None, min_length=1, max_length=60)
    date: DateType | None = None
    payment_method: str | None = Field(default=None, max_length=40)
    note: str | None = Field(default=None, max_length=500)


class ExpenseRead(BaseModel):
    id: str
    amount: float
    description: str
    category: str
    date: DateType
    payment_method: str
    note: str
    created_at: datetime


class DailySpend(BaseModel):
    date: DateType
    total: float


class CategorySpend(BaseModel):
    category: str
    total: float


class DashboardSummary(BaseModel):
    month: str
    total: float
    previous_total: float
    change_percent: float | None
    transaction_count: int
    daily_spend: list[DailySpend]
    category_spend: list[CategorySpend]