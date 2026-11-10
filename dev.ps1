# dev.ps1
Write-Host "=== Arrancando el proyecto... ===" -ForegroundColor Cyan

# Arrancar el Backend en una nueva ventana de PowerShell
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload'

# Arrancar el Frontend en otra nueva ventana de PowerShell
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd frontend; npm run dev'

Write-Host "Ventanas de desarrollo lanzadas." -ForegroundColor Green