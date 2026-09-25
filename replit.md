# Expense Tracker

Personal finance web app for recording expenses and understanding monthly spending.

## Run & Operate

- `pnpm --filter @workspace/expense-tracker run dev` — run the Vite frontend and Python API
- `uv run --project . --directory artifacts/expense-tracker python -m backend.init_db` — initialize the development database schema once
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: FastAPI + SQLModel (Python 3.11)
- DB: PostgreSQL + SQLModel
- Frontend: React + Vite + Tailwind
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: Vite bundle served by FastAPI

## Where things live

- `artifacts/expense-tracker/backend/` — Python API, SQLModel model, and development schema setup
- `artifacts/expense-tracker/src/` — React app and theme
- `lib/api-spec/openapi.yaml` — API contract; generated client hooks call `/_api`
- `lib/api-client-react/src/generated/` — generated frontend API hooks

## Architecture decisions

- Python serves both the production frontend bundle and API; development runs the API beside Vite.
- The app starts with an empty ledger instead of fabricated financial history.

## Product

- Create, edit, search, filter, and delete expenses.
- Review monthly totals, daily spending, category totals, and transaction history.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
