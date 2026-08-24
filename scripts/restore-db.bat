@echo off
setlocal
cd /d "%~dp0\.."

if "%~1"=="" (
  echo Gunakan:
  echo scripts\restore-db.bat path\ke\backup.sql
  pause
  exit /b 1
)

if not exist "%~1" (
  echo File backup tidak ditemukan: %~1
  pause
  exit /b 1
)

echo Restore akan memasukkan file berikut ke database pos_apotek:
echo %~1
echo.
set /p CONFIRM=Ketik RESTORE untuk lanjut: 
if /I not "%CONFIRM%"=="RESTORE" (
  echo Restore dibatalkan.
  pause
  exit /b 1
)

type "%~1" | docker exec -i pos_apotek_postgres psql -U postgres -d pos_apotek

if errorlevel 1 (
  echo Restore gagal.
  pause
  exit /b 1
)

echo Restore selesai.
pause
