# setup.ps1
Write-Host "=== Iniciando configuracion del proyecto ===" -ForegroundColor Cyan

# 1. Crear carpetas base
Write-Host "Creando carpetas..."
New-Item -ItemType Directory -Force -Path backend, frontend | Out-Null

# 2. Configurar Backend (Python + FastAPI)
Write-Host "Configurando Backend..."
cd backend
python -m venv venv
# Activar el entorno virtual e instalar dependencias base
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn sqlmodel psycopg2-binary python-dotenv groq
pip freeze > requirements.txt
cd ..

# 3. Configurar Frontend (React + TypeScript con Vite)
Write-Host "Configurando Frontend..."
# Crear proyecto Vite en la carpeta frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
cd ..

Write-Host "=== Configuracion completada con exito ===" -ForegroundColor Green