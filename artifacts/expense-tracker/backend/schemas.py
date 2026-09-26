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
    income_total: float = 0
    net_savings: float = 0
    daily_average: float = 0
    top_category: str | None = None
    budgets: list["BudgetRead"] = []


class UserRead(BaseModel):
    id: str
    name: str
    email: str


class AuthInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=8, max_length=128)


class IncomeInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    source: str = Field(min_length=1, max_length=180)
    category: str = Field(min_length=1, max_length=60)
    date: DateType
    note: str = Field(default="", max_length=500)


class IncomeUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    source: str | None = Field(default=None, min_length=1, max_length=180)
    category: str | None = Field(default=None, min_length=1, max_length=60)
    date: DateType | None = None
    note: str | None = Field(default=None, max_length=500)


class IncomeRead(IncomeInput):
    id: str
    created_at: datetime


class BudgetInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    category: str = Field(min_length=1, max_length=60)
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    limit_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetRead(BudgetInput):
    id: str
    spent: float = 0
    created_at: datetime


class SubscriptionInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    billing_cycle: str = Field(default="monthly", pattern=r"^(monthly|yearly)$")
    next_payment: DateType
    category: str = Field(default="Subscriptions", max_length=60)


class SubscriptionRead(SubscriptionInput):
    id: str
    created_at: datetime


class SplitBillInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    total_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    people_count: int = Field(default=2, ge=2, le=50)
    your_share: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    status: str = Field(default="open", pattern=r"^(open|settled)$")


class SplitBillRead(SplitBillInput):
    id: str
    your_share: Decimal
    created_at: datetime


class AdvisorInput(BaseModel):
    question: str = Field(min_length=2, max_length=1200)