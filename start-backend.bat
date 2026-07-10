@echo off
echo Starting LocalGPT Studio Backend...
cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
