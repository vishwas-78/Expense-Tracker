"""Initialize the development database schema once before running the app."""

from sqlalchemy import text
from sqlmodel import SQLModel

from backend.database import engine
from backend import models  # noqa: F401 — registers the model metadata


def main() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE expense_tracker_expenses "
                "ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_expense_tracker_expenses_user_id "
                "ON expense_tracker_expenses (user_id)"
            )
        )
    print("Expense tracker schema is ready in the configured development database.")


if __name__ == "__main__":
    main()