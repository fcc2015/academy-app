@echo off
echo ==============================================
echo    STARTING ACADEMY APP (BACKEND + FRONTEND)
echo ==============================================
echo.

echo Starting Backend Server on port 8000...
start "Academy Backend" cmd /k "cd backend && venv\Scripts\python.exe run.py"

echo Starting Frontend Server on port 5173...
start "Academy Frontend" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo You can close this window now.
exit
