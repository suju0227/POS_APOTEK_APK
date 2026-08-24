@echo off
setlocal
cd /d "%~dp0\.."
docker logs -f pos_apotek_backend
pause
