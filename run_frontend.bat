@echo off
echo ========================================================
echo   Starting MedSynAI Frontend (React + Vite)
echo ========================================================

cd frontend

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js / npm was not found on your system PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo After installing Node.js, reopen your terminal and run this script again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing frontend dependencies...
    npm install
)

echo.
echo [INFO] Starting Vite dev server at http://localhost:5173 ...
npm run dev
pause
