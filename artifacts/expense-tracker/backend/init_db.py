"""Initialize the development database schema once before running the app."""

from sqlmodel import SQLModel

from backend.database import engine
from backend import models  # noqa: F401 — registers the model metadata


def main() -> None:
    SQLModel.metadata.create_all(engine)
    print("Expense tracker schema is ready in the configured development database.")


if __name__ == "__main__":
    main()