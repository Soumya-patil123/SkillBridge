# SkillBridge

SkillBridge is a full-stack learning workspace for professionals who want to build practical skills with a clear path, expert guidance, and visible momentum.

## What is included

- Learner dashboard with progress metrics, weekly learning activity, recent activity, and the next mentor session
- Searchable and filterable course library
- Course detail pages with lessons and persistent progress
- Mentor directory with expertise filtering and session booking
- Upcoming mentor sessions screen
- Editable learner profile and weekly learning goal
- Express API with OpenAPI-first generated client and validation schemas
- PostgreSQL persistence through Drizzle ORM
- Seed data so the app is useful immediately after setup
- VS Code tasks for starting the API and web app

## Run locally in VS Code

### Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- PostgreSQL 14 or newer

Open a terminal in the extracted project folder. In Windows Command Prompt, that can be:

```bat
cd /d "%USERPROFILE%\Downloads\SkillBridge-project"
```

In PowerShell:

```powershell
Set-Location "$HOME\Downloads\SkillBridge-project"
```

Create a local database named `skillbridge`, then create a `.env` file in the project root.

Windows Command Prompt:

```bat
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillbridge
SESSION_SECRET=replace-this-with-a-long-random-string
```

Install dependencies and create the database tables:

```bash
pnpm install --prod=false
pnpm --filter @workspace/db run push
```

`drizzle-kit` is a development dependency, so `--prod=false` matters if your terminal has `NODE_ENV=production` or a pnpm production setting. Run this from the project root, not from `C:\Users\<you>` or another parent folder.
The workspace install guard and API development command use Node and pnpm syntax, so they work in Windows Command Prompt as well as macOS, Linux, and Git Bash.

If the database command still says that `drizzle-kit` is not recognized, repair the install and verify the binary directly:

```bat
pnpm install --force --prod=false
pnpm --filter @workspace/db exec drizzle-kit --version
pnpm --filter @workspace/db run push
```

Open two VS Code terminals and run:

Windows Command Prompt:

```bat
:: Terminal 1
set "PORT=5000" && pnpm --filter @workspace/api-server run dev

:: Terminal 2
set "PORT=5173" && set "BASE_PATH=/" && pnpm --filter @workspace/skillbridge run dev
```

PowerShell:

```powershell
# Terminal 1
$env:PORT="5000"; pnpm --filter @workspace/api-server run dev

# Terminal 2
$env:PORT="5173"; $env:BASE_PATH="/"; pnpm --filter @workspace/skillbridge run dev
```

macOS, Linux, or Git Bash:

```bash
# Terminal 1
PORT=5000 pnpm --filter @workspace/api-server run dev

# Terminal 2
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/skillbridge run dev
```

Then open http://localhost:5173.

The local Vite server proxies `/api` requests to `http://localhost:5000`. To use a different API port, set `VITE_API_PROXY` when starting the web app:

```bash
PORT=5173 BASE_PATH=/ VITE_API_PROXY=http://localhost:5050 pnpm --filter @workspace/skillbridge run dev
```

## VS Code tasks

Use **Terminal → Run Task** and choose:

- `SkillBridge: API`
- `SkillBridge: Web`
- `SkillBridge: Typecheck`

The API and web tasks expect `DATABASE_URL` to be available in the VS Code terminal environment.

For Windows, you can also run `scripts\setup-windows.cmd` from the project root. It copies `.env.example` when needed, installs all workspace dependencies, verifies `drizzle-kit`, and pushes the database schema.

## Useful commands

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

## Project map

```text
artifacts/skillbridge/          React + Vite frontend
artifacts/api-server/           Express API server
lib/api-spec/                   OpenAPI source contract
lib/api-client-react/           Generated React Query hooks
lib/api-zod/                    Generated Zod request/response schemas
lib/db/                         Drizzle schema and database client
.vscode/                        Local VS Code tasks
```

## Demo data

The API seeds a demo learner, four courses, lessons, mentors, activity entries, enrollments, and an upcoming mentor session on first use. It is intentionally local/demo-oriented: authentication is not enabled in this starter project, so the seeded learner is the active profile.