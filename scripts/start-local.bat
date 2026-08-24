@echo off
setlocal
cd /d "%~dp0\.."

if not exist "backend\.env" (
  echo backend\.env belum ada, menyalin dari backend\.env.example
  copy "backend\.env.example" "backend\.env" > nul
)

if not exist "frontend\.env" (
  echo frontend\.env belum ada, menyalin dari frontend\.env.example
  copy "frontend\.env.example" "frontend\.env" > nul
)

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

%COMPOSE% -f docker-compose.local.yml up -d --build
if errorlevel 1 exit /b %errorlevel%
echo.
echo POS Apotek local mode sedang berjalan.
echo Buka dari server: http://localhost
echo Buka dari client LAN: http://IP_SERVER
pause
