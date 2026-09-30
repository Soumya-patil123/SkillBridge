@echo off
setlocal

cd /d "%~dp0.."

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo Created .env from .env.example.
)

echo Installing workspace dependencies, including development tools...
call pnpm install --prod=false
if errorlevel 1 (
  echo Dependency installation failed.
  exit /b 1
)

echo Verifying drizzle-kit...
call pnpm --filter @workspace/db exec drizzle-kit --version
if errorlevel 1 (
  echo drizzle-kit is still unavailable. Try: pnpm install --force --prod=false
  exit /b 1
)

echo Pushing the SkillBridge database schema...
call pnpm --filter @workspace/db run push
if errorlevel 1 (
  echo Database schema push failed. Check DATABASE_URL in .env and make sure PostgreSQL is running.
  exit /b 1
)

echo SkillBridge local setup is complete.