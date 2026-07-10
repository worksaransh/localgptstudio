@echo off
echo Starting LocalGPT Studio Frontend...
cd /d "%~dp0frontend"
npx next dev -p 3000
pause
