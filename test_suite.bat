@echo off
echo ========================================================
echo Ejecutando Suite de Pruebas Automatizadas (16 tests)
echo ========================================================
set PYTHONPATH=%CD%\backend
call .venv\Scripts\activate.bat
pytest backend\tests -v
