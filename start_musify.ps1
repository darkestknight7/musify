param(
  [switch]$Public
)

Write-Host "Starting Musify..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot"

if (-not (Test-Path "dist")) {
  Write-Host "Building production frontend..." -ForegroundColor Yellow
  npm install
  npm run build
}

$backend = Start-Process python -ArgumentList "server.py" -WorkingDirectory "$PSScriptRoot" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2

if ($Public) {
  Write-Host "Opening public HTTPS tunnel for phones & tablets..." -ForegroundColor Magenta
  Start-Process ssh -ArgumentList "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", "80:127.0.0.1:8000", "nokey@localhost.run"
} else {
  Start-Process "http://127.0.0.1:8000"
  Write-Host "Musify is running at http://127.0.0.1:8000" -ForegroundColor Green
  Write-Host "Tip: Run '.\start_musify.ps1 -Public' to get an HTTPS link for phones & tablets." -ForegroundColor DarkGray
}

Wait-Process -Id $backend.Id
