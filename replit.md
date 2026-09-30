# SkillBridge

SkillBridge is a full-stack learning workspace where professionals discover practical courses, track progress, and book time with expert mentors.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/skillbridge` — React + Vite learner workspace
- `artifacts/api-server` — Express API implementation
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/api-client-react/src/generated` — generated React Query client
- `lib/api-zod/src/generated` — generated request and response validation
- `lib/db/src/schema` — Drizzle schema for the SkillBridge tables
- `README.md` — local VS Code setup and project map

## Architecture decisions

- API contracts are written in OpenAPI first, then generated into the React Query client and Zod validators.
- The learner experience uses a seeded demo profile so the project is immediately usable locally without an external auth provider.
- Course progress, mentor bookings, profile preferences, and activity records are persisted in PostgreSQL through Drizzle.
- The web app uses relative `/api` requests; the Replit proxy handles them in the workspace and Vite proxies them to the API port during local development.

## Product

- Dashboard with weekly learning rhythm, active course progress, and recent activity
- Course discovery, course details, enrollment, lesson completion, and progress tracking
- Mentor search, expertise filtering, session booking, and upcoming sessions
- Editable learner profile, skills, timezone, and weekly goal

## User preferences

Keep the app runnable locally in VS Code and include the complete source tree in the downloadable project archive.

## Gotchas

- `DATABASE_URL` is required by the shared database package and must be available before starting the API.
- Run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`.
- Local frontend development requires `PORT` and `BASE_PATH`; the README and `.vscode/tasks.json` include working values.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
