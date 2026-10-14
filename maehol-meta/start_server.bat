@echo off
cd /d "%~dp0"
echo Meta Tour Maehol: http://localhost:8000  (Ctrl+C to stop)
start "" http://localhost:8000
python -m http.server 8000
