@echo off
echo ========================================================
echo Iniciando Frontend Vite (React 19 + TypeScript + Tailwind)
echo Puerto: 5175 (Evita colision con puerto 5173)
echo ========================================================
cd frontend
npm run dev -- --port 5175
