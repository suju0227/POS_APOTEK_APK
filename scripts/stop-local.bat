@echo off
setlocal
cd /d "%~dp0\.."

docker compose version > nul 2>&1
if not errorlevel 1 (
  set "COMPOSE=docker compose"
) else (
  docker-compose --version > nul 2>&1
  if not errorlevel 1 (
    set "COMPOSE=docker-compose"
  ) else (
    echo Docker Compose tidak ditemukan.
    echo Install Docker Desktop atau pastikan docker-compose.exe ada di PATH.
    exit /b 1
  )
)

%COMPOSE% -f docker-compose.local.yml down
if errorlevel 1 exit /b %errorlevel%
echo.
echo POS Apotek local mode dihentikan. Data PostgreSQL tetap aman selama volume tidak dihapus.
pause
