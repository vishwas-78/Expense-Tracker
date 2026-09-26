import base64
import csv
import hashlib
import hmac
import io
import os
import re
import secrets
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func, select, text
from sqlmodel import Session

from backend.database import engine, get_session
from backend.models import Budget, Expense, Income, SplitBill, Subscription, User
from backend.schemas import (
    AdvisorInput,
    AuthInput,
    BudgetInput,
    BudgetRead,
    CategorySpend,
    DashboardSummary,
    DailySpend,
    ExpenseInput,
    ExpenseRead,
    ExpenseUpdate,
    IncomeInput,
    IncomeRead,
    IncomeUpdate,
    SplitBillInput,
    SplitBillRead,
    SubscriptionInput,
    SubscriptionRead,
    UserRead,
)

app = FastAPI(title="FinTrack API", version="2.0.0")
SessionDep = Annotated[Session, Depends(get_session)]
STATIC_DIR = Path(__file__).resolve().parents[1] / "dist" / "public"
SESSION_COOKIE = "fintrack_session"
SESSION_TTL = 60 * 60 * 24 * 30


def parse_month(value: str | None) -> date:
    if value is None:
        return date.today().replace(day=1)
    try:
        return datetime.strptime(value, "%Y-%m").date().replace(day=1)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Month must use YYYY-MM format.") from error


def next_month(start: date) -> date:
    return date(start.year + 1, 1, 1) if start.month == 12 else date(start.year, start.month + 1, 1)


def app_secret() -> bytes:
    secret = os.getenv("SESSION_SECRET")
    if not secret:
        raise RuntimeError("SESSION_SECRET is required for secure sessions.")
    return secret.encode()


def encode_session(user_id: str) -> str:
    expires = int(datetime.now(timezone.utc).timestamp()) + SESSION_TTL
    payload = f"{user_id}.{expires}".encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(app_secret(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def decode_session(value: str | None) -> str | None:
    if not value or "." not in value:
        return None
    encoded, signature = value.rsplit(".", 1)
    expected = hmac.new(app_secret(), encoded.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        user_id, expiry = base64.urlsafe_b64decode(f"{encoded}==").decode().rsplit(".", 1)
        if int(expiry) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return user_id
    except (ValueError, UnicodeDecodeError):
        return None


def current_user(session: SessionDep, cookie: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None) -> User:
    user_id = decode_session(cookie)
    user = session.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_value, digest_value = stored.split("$", 2)
        salt = base64.urlsafe_b64decode(salt_value)
        expected = base64.urlsafe_b64decode(digest_value)
        actual = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def auth_response(user: User) -> dict[str, object]:
    return {"user": UserRead(id=user.id, name=user.name, email=user.email)}


def set_session(response: Response, user: User) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        encode_session(user.id),
        max_age=SESSION_TTL,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )


def to_expense(expense: Expense) -> ExpenseRead:
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


def to_income(item: Income) -> IncomeRead:
    return IncomeRead(
        id=item.id,
        amount=item.amount,
        source=item.source,
        category=item.category,
        date=item.date,
        note=item.note,
        created_at=item.created_at,
    )


def to_budget(item: Budget, spent: Decimal = Decimal("0")) -> BudgetRead:
    return BudgetRead(
        id=item.id,
        category=item.category,
        month=item.month,
        limit_amount=item.limit_amount,
        spent=float(spent),
        created_at=item.created_at,
    )


def to_subscription(item: Subscription) -> SubscriptionRead:
    return SubscriptionRead(
        id=item.id,
        name=item.name,
        amount=item.amount,
        billing_cycle=item.billing_cycle,
        next_payment=item.next_payment,
        category=item.category,
        created_at=item.created_at,
    )


def to_split_bill(item: SplitBill) -> SplitBillRead:
    return SplitBillRead(
        id=item.id,
        title=item.title,
        total_amount=item.total_amount,
        people_count=item.people_count,
        your_share=item.your_share,
        status=item.status,
        created_at=item.created_at,
    )


@app.get("/_api/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/_api/auth/signup", response_model=dict)
def signup(payload: AuthInput, session: SessionDep, response: Response) -> dict[str, object]:
    email = payload.email.lower()
    if session.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=email, name=(payload.name or email.split("@")[0]).strip(), password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    set_session(response, user)
    return auth_response(user)


@app.post("/_api/auth/login", response_model=dict)
def login(payload: AuthInput, session: SessionDep, response: Response) -> dict[str, object]:
    user = session.scalars(select(User).where(User.email == payload.email.lower())).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    set_session(response, user)
    return auth_response(user)


@app.post("/_api/auth/logout", response_model=dict)
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "signed_out"}


@app.get("/_api/auth/me", response_model=dict)
def me(user: CurrentUser) -> dict[str, object]:
    return auth_response(user)


@app.get("/_api/expenses", response_model=list[ExpenseRead])
def list_expenses(
    session: SessionDep,
    user: CurrentUser,
    month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
    category: Annotated[str | None, Query(max_length=60)] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[ExpenseRead]:
    statement = select(Expense).where(Expense.user_id == user.id)
    if month:
        start = parse_month(month)
        statement = statement.where(Expense.date >= start, Expense.date < next_month(start))
    if category:
        statement = statement.where(Expense.category == category)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        statement = statement.where(Expense.description.ilike(needle) | Expense.note.ilike(needle))
    rows = session.scalars(statement.order_by(Expense.date.desc(), Expense.created_at.desc())).all()
    return [to_expense(row) for row in rows]


@app.post("/_api/expenses", response_model=ExpenseRead, status_code=201)
def create_expense(payload: ExpenseInput, session: SessionDep, user: CurrentUser) -> ExpenseRead:
    expense = Expense(user_id=user.id, **payload.model_dump())
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return to_expense(expense)


@app.patch("/_api/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: str, payload: ExpenseUpdate, session: SessionDep, user: CurrentUser) -> ExpenseRead:
    expense = session.get(Expense, expense_id)
    if expense is None or expense.user_id != user.id:
        raise HTTPException(status_code=404, detail="Expense not found.")
    changes = payload.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise HTTPException(status_code=422, detail="Expense fields cannot be null.")
    for field, value in changes.items():
        setattr(expense, field, value)
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return to_expense(expense)


@app.delete("/_api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: str, session: SessionDep, user: CurrentUser) -> Response:
    expense = session.get(Expense, expense_id)
    if expense is None or expense.user_id != user.id:
        raise HTTPException(status_code=404, detail="Expense not found.")
    session.delete(expense)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/income", response_model=list[IncomeRead])
def list_income(session: SessionDep, user: CurrentUser, month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None) -> list[IncomeRead]:
    statement = select(Income).where(Income.user_id == user.id)
    if month:
        start = parse_month(month)
        statement = statement.where(Income.date >= start, Income.date < next_month(start))
    return [to_income(item) for item in session.scalars(statement.order_by(Income.date.desc(), Income.created_at.desc())).all()]


@app.post("/_api/income", response_model=IncomeRead, status_code=201)
def create_income(payload: IncomeInput, session: SessionDep, user: CurrentUser) -> IncomeRead:
    item = Income(user_id=user.id, **payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_income(item)


@app.patch("/_api/income/{income_id}", response_model=IncomeRead)
def update_income(income_id: str, payload: IncomeUpdate, session: SessionDep, user: CurrentUser) -> IncomeRead:
    item = session.get(Income, income_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Income record not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(status_code=422, detail="Income fields cannot be null.")
        setattr(item, field, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_income(item)


@app.delete("/_api/income/{income_id}", status_code=204)
def delete_income(income_id: str, session: SessionDep, user: CurrentUser) -> Response:
    item = session.get(Income, income_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Income record not found.")
    session.delete(item)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/budgets", response_model=list[BudgetRead])
def list_budgets(session: SessionDep, user: CurrentUser, month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None) -> list[BudgetRead]:
    active_month = month or date.today().strftime("%Y-%m")
    budgets = session.scalars(select(Budget).where(Budget.user_id == user.id, Budget.month == active_month).order_by(Budget.category)).all()
    result = []
    start = parse_month(active_month)
    end = next_month(start)
    for budget in budgets:
        spent = session.execute(select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user.id, Expense.category == budget.category, Expense.date >= start, Expense.date < end
        )).scalar_one()
        result.append(to_budget(budget, Decimal(str(spent))))
    return result


@app.post("/_api/budgets", response_model=BudgetRead, status_code=201)
def create_budget(payload: BudgetInput, session: SessionDep, user: CurrentUser) -> BudgetRead:
    budget = Budget(user_id=user.id, **payload.model_dump())
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return to_budget(budget)


@app.delete("/_api/budgets/{budget_id}", status_code=204)
def delete_budget(budget_id: str, session: SessionDep, user: CurrentUser) -> Response:
    budget = session.get(Budget, budget_id)
    if budget is None or budget.user_id != user.id:
        raise HTTPException(status_code=404, detail="Budget not found.")
    session.delete(budget)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/subscriptions", response_model=list[SubscriptionRead])
def list_subscriptions(session: SessionDep, user: CurrentUser) -> list[SubscriptionRead]:
    return [to_subscription(item) for item in session.scalars(select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.next_payment)).all()]


@app.post("/_api/subscriptions", response_model=SubscriptionRead, status_code=201)
def create_subscription(payload: SubscriptionInput, session: SessionDep, user: CurrentUser) -> SubscriptionRead:
    item = Subscription(user_id=user.id, **payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_subscription(item)


@app.delete("/_api/subscriptions/{subscription_id}", status_code=204)
def delete_subscription(subscription_id: str, session: SessionDep, user: CurrentUser) -> Response:
    item = session.get(Subscription, subscription_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    session.delete(item)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/split-bills", response_model=list[SplitBillRead])
def list_split_bills(session: SessionDep, user: CurrentUser) -> list[SplitBillRead]:
    return [to_split_bill(item) for item in session.scalars(select(SplitBill).where(SplitBill.user_id == user.id).order_by(SplitBill.created_at.desc())).all()]


@app.post("/_api/split-bills", response_model=SplitBillRead, status_code=201)
def create_split_bill(payload: SplitBillInput, session: SessionDep, user: CurrentUser) -> SplitBillRead:
    data = payload.model_dump()
    data["your_share"] = data["your_share"] or (data["total_amount"] / data["people_count"])
    item = SplitBill(user_id=user.id, **data)
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_split_bill(item)


@app.patch("/_api/split-bills/{bill_id}/settle", response_model=SplitBillRead)
def settle_split_bill(bill_id: str, session: SessionDep, user: CurrentUser) -> SplitBillRead:
    item = session.get(SplitBill, bill_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Split bill not found.")
    item.status = "settled"
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_split_bill(item)


@app.delete("/_api/split-bills/{bill_id}", status_code=204)
def delete_split_bill(bill_id: str, session: SessionDep, user: CurrentUser) -> Response:
    item = session.get(SplitBill, bill_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Split bill not found.")
    session.delete(item)
    session.commit()
    return Response(status_code=204)


@app.get("/_api/dashboard", response_model=DashboardSummary)
def get_dashboard(session: SessionDep, user: CurrentUser, month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None) -> DashboardSummary:
    start = parse_month(month)
    end = next_month(start)
    previous_start = (start - timedelta(days=1)).replace(day=1)
    current_rows = session.scalars(select(Expense).where(Expense.user_id == user.id, Expense.date >= start, Expense.date < end)).all()
    income_rows = session.scalars(select(Income).where(Income.user_id == user.id, Income.date >= start, Income.date < end)).all()
    previous_total = session.execute(select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.user_id == user.id, Expense.date >= previous_start, Expense.date < start
    )).scalar_one()
    daily_totals = session.execute(select(Expense.date, func.sum(Expense.amount)).where(
        Expense.user_id == user.id, Expense.date >= start, Expense.date < end
    ).group_by(Expense.date)).all()
    daily_by_date = {day: Decimal(str(total)) for day, total in daily_totals}
    daily_spend = [DailySpend(date=day, total=float(daily_by_date.get(day, Decimal("0")))) for day in (
        start + timedelta(days=offset) for offset in range(monthrange(start.year, start.month)[1])
    )]
    category_totals: dict[str, Decimal] = {}
    for expense in current_rows:
        category_totals[expense.category] = category_totals.get(expense.category, Decimal("0")) + expense.amount
    category_spend = [CategorySpend(category=name, total=float(total)) for name, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)]
    total = sum((expense.amount for expense in current_rows), Decimal("0"))
    income_total = sum((item.amount for item in income_rows), Decimal("0"))
    previous_total = Decimal(str(previous_total))
    change_percent = float((total - previous_total) / previous_total * Decimal("100")) if previous_total != 0 else None
    budgets = []
    for budget in session.scalars(select(Budget).where(Budget.user_id == user.id, Budget.month == start.strftime("%Y-%m"))).all():
        spent = category_totals.get(budget.category, Decimal("0"))
        budgets.append(to_budget(budget, spent))
    return DashboardSummary(
        month=start.strftime("%Y-%m"),
        total=float(total),
        previous_total=float(previous_total),
        change_percent=change_percent,
        transaction_count=len(current_rows) + len(income_rows),
        daily_spend=daily_spend,
        category_spend=category_spend,
        income_total=float(income_total),
        net_savings=float(income_total - total),
        daily_average=float(total / Decimal(str(monthrange(start.year, start.month)[1]))),
        top_category=category_spend[0].category if category_spend else None,
        budgets=budgets,
    )


def ledger_rows(session: Session, user: User) -> list[tuple[str, str, str, str, str, str]]:
    expenses = session.scalars(select(Expense).where(Expense.user_id == user.id).order_by(Expense.date.desc())).all()
    income = session.scalars(select(Income).where(Income.user_id == user.id).order_by(Income.date.desc())).all()
    rows = [
        ("Expense", item.date.isoformat(), item.description, item.category, f"{item.amount:.2f}", item.payment_method)
        for item in expenses
    ]
    rows += [
        ("Income", item.date.isoformat(), item.source, item.category, f"{item.amount:.2f}", "")
        for item in income
    ]
    return sorted(rows, key=lambda row: row[1], reverse=True)


@app.get("/_api/export.csv")
def export_csv(session: SessionDep, user: CurrentUser) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Type", "Date", "Description", "Category", "Amount (INR)", "Payment method"])
    writer.writerows(ledger_rows(session, user))
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="fintrack-ledger.csv"'})


def simple_pdf(lines: list[str]) -> bytes:
    safe_lines = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:110] for line in lines[:42]]
    content = "BT /F1 10 Tf 48 760 Td " + " ".join(f"({line}) Tj 0 -16 Td" for line in safe_lines) + " ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(content.encode())} >>\nstream\n{content}\nendstream".encode(),
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    pdf.extend("".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:]).encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(pdf)


@app.get("/_api/export.pdf")
def export_pdf(session: SessionDep, user: CurrentUser) -> Response:
    rows = ledger_rows(session, user)
    lines = [f"FinTrack ledger — {user.name}", "", "Type    Date        Description                         Category              INR"]
    lines += [f"{kind:<7} {day:<11} {description:<35} {category:<20} ₹{amount}" for kind, day, description, category, amount, _ in rows]
    return Response(simple_pdf(lines), media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="fintrack-ledger.pdf"'})


def format_inr(value: Decimal) -> str:
    rounded = int(value.quantize(Decimal("1")))
    sign = "-" if rounded < 0 else ""
    digits = str(abs(rounded))
    if len(digits) <= 3:
        grouped = digits
    else:
        tail = digits[-3:]
        head = digits[:-3]
        groups: list[str] = []
        while head:
            groups.insert(0, head[-2:])
            head = head[:-2]
        grouped = ",".join(groups + [tail])
    return f"₹{sign}{grouped}"


def local_financial_advice(
    question: str,
    current_expenses: list[Expense],
    current_income: list[Income],
    previous_expenses: list[Expense],
    budgets: list[Budget],
    subscriptions: list[Subscription],
    month: date,
) -> str:
    """Generate useful, deterministic advice from the user's local ledger only."""
    current_total = sum((item.amount for item in current_expenses), Decimal("0"))
    income_total = sum((item.amount for item in current_income), Decimal("0"))
    savings = income_total - current_total
    previous_total = sum((item.amount for item in previous_expenses), Decimal("0"))
    categories: dict[str, Decimal] = {}
    for item in current_expenses:
        categories[item.category] = categories.get(item.category, Decimal("0")) + item.amount
    ranked_categories = sorted(categories.items(), key=lambda item: item[1], reverse=True)
    question_text = re.sub(r"\s+", " ", question.strip().lower())
    category_aliases = {
        "food & dining": ("food", "dining", "restaurant", "eating"),
        "housing": ("rent", "housing", "home"),
        "transport": ("transport", "travel", "cab", "commute"),
        "shopping": ("shopping", "buy", "purchases"),
        "entertainment": ("entertainment", "movie", "movies", "fun"),
        "bills": ("bill", "bills", "utilities"),
        "health": ("health", "medical", "medicine"),
    }
    requested_category = next(
        (
            category
            for category in categories
            if category.lower() in question_text
            or any(alias in question_text for alias in category_aliases.get(category.lower(), ()))
        ),
        None,
    )

    if not current_expenses and not current_income:
        return (
            f"There is no activity in {month.strftime('%B %Y')} yet. Add an expense or income record and "
            "I’ll calculate your spending rhythm, category habits, and a realistic budget here."
        )

    response: list[str] = [f"Here’s your {month.strftime('%B')} snapshot: {format_inr(current_total)} spent"]
    if income_total:
        response.append(f"against {format_inr(income_total)} income, leaving {format_inr(savings)} in savings.")
    else:
        response.append("and no income has been logged for this month yet.")

    if requested_category:
        category_total = categories[requested_category]
        share = (category_total / current_total * Decimal("100")) if current_total else Decimal("0")
        response.append(
            f"\n{requested_category} is {format_inr(category_total)} ({share.quantize(Decimal('1'))}% of your spending) this month."
        )
    elif any(word in question_text for word in ("where", "category", "breakdown", "spend", "spent")) and ranked_categories:
        top_categories = ", ".join(f"{name}: {format_inr(total)}" for name, total in ranked_categories[:3])
        response.append(f"\nYour largest categories are {top_categories}.")

    if previous_total:
        change = (current_total - previous_total) / previous_total * Decimal("100")
        direction = "up" if change > 0 else "down"
        response.append(f"That is {abs(change).quantize(Decimal('1'))}% {direction} from last month.")

    if budgets:
        budget_notes: list[str] = []
        for budget in budgets:
            spent = categories.get(budget.category, Decimal("0"))
            difference = budget.limit_amount - spent
            if difference < 0:
                budget_notes.append(f"{budget.category} is {format_inr(abs(difference))} over")
            else:
                budget_notes.append(f"{budget.category} has {format_inr(difference)} left")
        response.append("\nBudget check: " + "; ".join(budget_notes[:3]) + ".")

    monthly_subscriptions = sum(
        (item.amount / Decimal("12") if item.billing_cycle == "yearly" else item.amount for item in subscriptions),
        Decimal("0"),
    )
    if monthly_subscriptions and any(word in question_text for word in ("subscription", "recurring", "renewal")):
        response.append(f"\nYour tracked recurring commitment is about {format_inr(monthly_subscriptions)} per month.")

    discretionary_categories = {"food & dining", "shopping", "entertainment", "transport", "other"}
    discretionary = [(name, total) for name, total in ranked_categories if name.lower() in discretionary_categories]
    if any(word in question_text for word in ("save", "saving", "trim", "reduce", "cut", "advice", "budget")):
        if discretionary:
            category, amount = discretionary[0]
            suggested_cut = max(Decimal("100"), (amount * Decimal("0.10")).quantize(Decimal("1")))
            response.append(
                f"\nBest first lever: {category}. A 10% trim would free about {format_inr(suggested_cut)} this month."
            )
        if not budgets and ranked_categories:
            top_category, top_amount = ranked_categories[0]
            suggested_limit = (top_amount * Decimal("1.05")).quantize(Decimal("1"))
            response.append(
                f"Set a {top_category} budget near {format_inr(suggested_limit)} next month, then review it after two weeks."
            )

    if savings < 0:
        response.append("\nYour spending is above logged income, so pause non-essential purchases until the gap closes.")
    elif income_total and savings / income_total < Decimal("0.20"):
        response.append("\nYour savings rate is below 20%; start by redirecting the suggested trim to a separate savings goal.")
    else:
        response.append("\nYou’re in a healthy position this month. Keep the largest category visible and repeat what is working.")

    return " ".join(response)


@app.post("/_api/advisor")
def advisor(payload: AdvisorInput, session: SessionDep, user: CurrentUser) -> dict[str, str]:
    current_month = date.today().replace(day=1)
    previous_month = (current_month - timedelta(days=1)).replace(day=1)
    current_expenses = session.scalars(select(Expense).where(
        Expense.user_id == user.id,
        Expense.date >= current_month,
        Expense.date < next_month(current_month),
    )).all()
    current_income = session.scalars(select(Income).where(
        Income.user_id == user.id,
        Income.date >= current_month,
        Income.date < next_month(current_month),
    )).all()
    previous_expenses = session.scalars(select(Expense).where(
        Expense.user_id == user.id,
        Expense.date >= previous_month,
        Expense.date < current_month,
    )).all()
    budgets = session.scalars(select(Budget).where(
        Budget.user_id == user.id,
        Budget.month == current_month.strftime("%Y-%m"),
    )).all()
    subscriptions = session.scalars(select(Subscription).where(Subscription.user_id == user.id)).all()
    return {"answer": local_financial_advice(
        payload.question,
        current_expenses,
        current_income,
        previous_expenses,
        budgets,
        subscriptions,
        current_month,
    )}


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