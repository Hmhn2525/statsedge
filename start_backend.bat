@echo off
echo ========================================================
echo Iniciando Backend FastAPI (Plataforma Analisis Predictivo)
echo Puerto: 8005 (Evita colision con puerto 8000)
echo ========================================================
set PYTHONPATH=%CD%\backend
call .venv\Scripts\activate.bat
uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload
