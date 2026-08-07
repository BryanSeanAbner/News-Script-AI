@echo off
echo ===================================================
echo   Memulai NewsScript AI Backend (FastAPI Python)
echo ===================================================
cd backend

if not exist venv (
    echo Membuat virtual environment Python...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo Memulai server FastAPI di http://localhost:8000 ...
uvicorn main:app --reload --port 8000
pause
