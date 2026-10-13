@echo off
echo ========================================================
echo   Starting MedSynAI Backend Server (FastAPI)
echo ========================================================

cd backend

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Python was not found on your system PATH!
        echo Please install Python 3.10-3.12 from https://www.python.org/
        echo IMPORTANT: Make sure to check the box "Add python.exe to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
)

:: Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo [INFO] Virtual environment .venv not found. Creating one now...
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        py -m venv .venv
    ) else (
        python -m venv .venv
    )
    echo [INFO] Installing backend dependencies from requirements.txt...
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

echo.
echo [INFO] Launching FastAPI backend at http://localhost:8000 ...
python -m uvicorn app:app --reload --port 8000
pause
