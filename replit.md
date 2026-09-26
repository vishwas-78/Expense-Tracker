# FinTrack

INR-native personal finance web app for Indian users to track money in, money out, and recurring commitments.

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
- DB: PostgreSQL + SQLModel with account-scoped records
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
- New accounts start with an empty ledger instead of fabricated financial history.
- Auth uses a signed, HttpOnly session cookie backed by `SESSION_SECRET`; all new records are scoped to the signed-in user.
- The advisor is deterministic and local: it reads only the signed-in user's ledger, compares monthly habits, checks budgets/subscriptions, and never calls an external LLM.

## Product

- Sign up and sign in with a fresh-vs-returning account state.
- Create, edit, search, filter, and delete expense and income records.
- Review INR-native net savings, spend, income, daily average, category breakdown, and monthly budgets.
- Track subscriptions, split bills, and export the ledger to CSV or PDF.
- Ask the AI advisor questions when a Gemini key is configured.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
