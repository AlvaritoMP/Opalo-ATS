# Script para copiar credenciales de Google OAuth desde Opalopy a Opalo ATS

$opaloATSBackend = "Opalo-ATS\backend"
$opalopyBackend = "Opalopy\backend"

Write-Host "🔍 Buscando credenciales de Google OAuth en Opalopy..." -ForegroundColor Cyan

# Verificar que existe el archivo .env de Opalopy
if (-not (Test-Path "$opalopyBackend\.env")) {
    Write-Host "❌ No se encontró el archivo .env en Opalopy\backend\" -ForegroundColor Red
    Write-Host "   Por favor, asegúrate de que el archivo existe." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo .env de Opalopy encontrado" -ForegroundColor Green

# Leer el archivo .env de Opalopy
$envContent = Get-Content "$opalopyBackend\.env"

# Extraer las variables necesarias
$googleClientId = ""
$googleClientSecret = ""
$googleRedirectUri = ""
$frontendUrl = "http://localhost:3001"  # Por defecto para Opalo ATS
$port = "5000"  # Por defecto

foreach ($line in $envContent) {
    if ($line -match "^GOOGLE_CLIENT_ID=(.+)$") {
        $googleClientId = $matches[1].Trim()
    }
    elseif ($line -match "^GOOGLE_CLIENT_SECRET=(.+)$") {
        $googleClientSecret = $matches[1].Trim()
    }
    elseif ($line -match "^GOOGLE_REDIRECT_URI=(.+)$") {
        $googleRedirectUri = $matches[1].Trim()
    }
    elseif ($line -match "^FRONTEND_URL=(.+)$") {
        # No copiamos FRONTEND_URL de Opalopy, usamos el de Opalo ATS
    }
    elseif ($line -match "^PORT=(.+)$") {
        # No copiamos PORT, usamos el por defecto
    }
}

# Verificar que tenemos las credenciales necesarias
if ([string]::IsNullOrWhiteSpace($googleClientId)) {
    Write-Host "❌ No se encontró GOOGLE_CLIENT_ID en el archivo .env de Opalopy" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($googleClientSecret)) {
    Write-Host "❌ No se encontró GOOGLE_CLIENT_SECRET en el archivo .env de Opalopy" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Credenciales encontradas:" -ForegroundColor Green
Write-Host "   GOOGLE_CLIENT_ID: $($googleClientId.Substring(0, [Math]::Min(20, $googleClientId.Length)))..." -ForegroundColor Gray
Write-Host "   GOOGLE_CLIENT_SECRET: $($googleClientSecret.Substring(0, [Math]::Min(10, $googleClientSecret.Length)))..." -ForegroundColor Gray

# Si no hay GOOGLE_REDIRECT_URI, usar el por defecto para desarrollo local
if ([string]::IsNullOrWhiteSpace($googleRedirectUri)) {
    $googleRedirectUri = "http://localhost:5000/api/auth/google/callback"
    Write-Host "⚠️  No se encontró GOOGLE_REDIRECT_URI, usando valor por defecto: $googleRedirectUri" -ForegroundColor Yellow
}

# Crear el contenido del archivo .env para Opalo ATS
$newEnvContent = @"
# Google OAuth2 Credentials
# Copiadas desde Opalopy el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret

# Redirect URI para OAuth callback
GOOGLE_REDIRECT_URI=$googleRedirectUri

# Frontend URL (para CORS y redirecciones)
FRONTEND_URL=$frontendUrl

# Puerto del servidor backend
PORT=$port

# Entorno
NODE_ENV=development
"@

# Crear el directorio si no existe
if (-not (Test-Path $opaloATSBackend)) {
    Write-Host "❌ El directorio $opaloATSBackend no existe" -ForegroundColor Red
    exit 1
}

# Escribir el archivo .env
$envPath = "$opaloATSBackend\.env"
$newEnvContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ Archivo .env creado en Opalo-ATS\backend\.env" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen:" -ForegroundColor Cyan
Write-Host "   - GOOGLE_CLIENT_ID: Copiado" -ForegroundColor White
Write-Host "   - GOOGLE_CLIENT_SECRET: Copiado" -ForegroundColor White
Write-Host "   - GOOGLE_REDIRECT_URI: $googleRedirectUri" -ForegroundColor White
Write-Host "   - FRONTEND_URL: $frontendUrl" -ForegroundColor White
Write-Host "   - PORT: $port" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   1. Verifica que el Redirect URI '$googleRedirectUri' esté configurado en Google Cloud Console" -ForegroundColor White
Write-Host "   2. Si usas un puerto diferente para el backend, actualiza PORT en el .env" -ForegroundColor White
Write-Host "   3. Reinicia el backend después de crear el .env" -ForegroundColor White
Write-Host ""

