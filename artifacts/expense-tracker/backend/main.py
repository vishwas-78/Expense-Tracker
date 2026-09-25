from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlmodel import Session

from backend.database import get_session
from backend.models import Expense
from backend.schemas import (
    CategorySpend,
    DashboardSummary,
    DailySpend,
    ExpenseInput,
    ExpenseRead,
    ExpenseUpdate,
)

app = FastAPI(title="Expense Tracker API", version="1.0.0")
SessionDep = Annotated[Session, Depends(get_session)]
STATIC_DIR = Path(__file__).resolve().parents[1] / "dist" / "public"


def parse_month(value: str | None) -> date:
    if value is None:
        return date.today().replace(day=1)
    try:
        parsed = datetime.strptime(value, "%Y-%m").date()
        return parsed.replace(day=1)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Month must use YYYY-MM format.") from error


def next_month(start: date) -> date:
    if start.month == 12:
        return date(start.year + 1, 1, 1)
    return date(start.year, start.month + 1, 1)


def to_read(expense: Expense) -> ExpenseRead:
    return ExpenseRead(
        id=expense.id,
        amount=float(expense.amount),
        description=expense.description,
        category=expense.category,
        date=expense.date,
        payment_method=expense.payment_method,
        note=expense.note,
        created_at=expense.created_at,
    )


@app.get("/_api/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/_api/expenses", response_model=list[ExpenseRead])
def list_expenses(
    session: SessionDep,
    month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
    category: Annotated[str | None, Query(max_length=60)] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[ExpenseRead]:
    statement = select(Expense)
    if month:
        start = parse_month(month)
        statement = statement.where(Expense.date >= start, Expense.date < next_month(start))
    if category:
        statement = statement.where(Expense.category == category)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        statement = statement.where(
            Expense.description.ilike(needle) | Expense.note.ilike(needle)
        )
    rows = session.scalars(
        statement.order_by(Expense.date.desc(), Expense.created_at.desc())
    ).all()
    return [to_read(row) for row in rows]


@app.post("/_api/expenses", response_model=ExpenseRead, status_code=201)
def create_expense(payload: ExpenseInput, session: SessionDep) -> ExpenseRead:
    expense = Expense(**payload.model_dump())
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return to_read(expense)


@app.patch("/_api/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    session: SessionDep,
) -> ExpenseRead:
    expense = session.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")

    changes = payload.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise HTTPException(status_code=422, detail="Expense fields cannot be null.")
    for field, value in changes.items():
        setattr(expense, field, value)
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return to_read(expense)


@app.delete("/_api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: str, session: SessionDep) -> Response:
    expense = session.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    session.delete(expense)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/dashboard", response_model=DashboardSummary)
def get_dashboard(
    session: SessionDep,
    month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
) -> DashboardSummary:
    start = parse_month(month)
    end = next_month(start)
    previous_end = start
    previous_start = (start - timedelta(days=1)).replace(day=1)

    current_rows = session.scalars(
        select(Expense).where(Expense.date >= start, Expense.date < end)
    ).all()
    previous_total = session.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.date >= previous_start,
            Expense.date < previous_end,
        )
    ).scalar_one()

    daily_totals = session.execute(
        select(Expense.date, func.sum(Expense.amount))
        .where(Expense.date >= start, Expense.date < end)
        .group_by(Expense.date)
    ).all()
    daily_by_date = {day: Decimal(str(total)) for day, total in daily_totals}
    daily_spend = [
        DailySpend(date=day, total=float(daily_by_date.get(day, Decimal("0"))))
        for day in (start + timedelta(days=offset) for offset in range(monthrange(start.year, start.month)[1]))
    ]

    category_totals: dict[str, Decimal] = {}
    for expense in current_rows:
        category_totals[expense.category] = (
            category_totals.get(expense.category, Decimal("0")) + expense.amount
        )
    category_spend = [
        CategorySpend(category=name, total=float(total))
        for name, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    ]

    total = sum((expense.amount for expense in current_rows), Decimal("0"))
    previous_total = Decimal(str(previous_total))
    change_percent = (
        float((total - previous_total) / previous_total * Decimal("100"))
        if previous_total != 0
        else None
    )

    return DashboardSummary(
        month=start.strftime("%Y-%m"),
        total=float(total),
        previous_total=float(previous_total),
        change_percent=change_percent,
        transaction_count=len(current_rows),
        daily_spend=daily_spend,
        category_spend=category_spend,
    )


@app.get("/{path:path}", include_in_schema=False)
def serve_frontend(path: str) -> FileResponse:
    root = STATIC_DIR.resolve()
    index = root / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=503, detail="The frontend build is missing.")

    requested = (root / path).resolve()
    if not requested.is_relative_to(root):
        raise HTTPException(status_code=404, detail="Not found.")
    if requested.is_file():
        return FileResponse(requested)
    if Path(path).suffix:
        raise HTTPException(status_code=404, detail="Not found.")
    return FileResponse(index)