Write-Host "Starting Musify (Backend + Frontend)..." -ForegroundColor Green
$backend = Start-Process python -ArgumentList "server.py" -WorkingDirectory "$PSScriptRoot" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
Set-Location "$PSScriptRoot"
npm run dev
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
