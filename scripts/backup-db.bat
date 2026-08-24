@echo off
setlocal
cd /d "%~dp0\.."

set BACKUP_DIR=%~dp0\..\backups\daily
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TIMESTAMP=%%i
set BACKUP_FILE=%BACKUP_DIR%\pos_apotek_%TIMESTAMP%.sql

docker exec -t pos_apotek_postgres pg_dump -U postgres pos_apotek > "%BACKUP_FILE%"

if errorlevel 1 (
  echo Backup gagal.
  pause
  exit /b 1
)

echo Backup berhasil dibuat:
echo %BACKUP_FILE%
pause
