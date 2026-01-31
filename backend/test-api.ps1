# Script de teste para API InstaSearch
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "TESTANDO ROTAS DA API INSTASEARCH" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

function Test-Endpoint {
    param (
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Description,
        [object]$Body = $null
    )
    
    Write-Host "`n$Description" -ForegroundColor Yellow
    Write-Host "$Method $Endpoint" -ForegroundColor Gray
    
    try {
        $uri = "http://localhost:3000$Endpoint"
        
        if ($Method -eq "POST" -and $Body) {
            $json = $Body | ConvertTo-Json
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Body $json -ContentType "application/json"
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method
        }
        
        Write-Host "✓ Status: 200 OK" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 5
    }
    catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Aguardar servidor estar pronto
Start-Sleep -Seconds 2

# 1. Health Check
Test-Endpoint -Endpoint "/api/health" -Description "1. Health Check"

# 2. Dashboard Overview
Test-Endpoint -Endpoint "/api/dashboard/overview" -Description "2. Dashboard Overview"

# 3. Profile Stats
Test-Endpoint -Endpoint "/api/profiles/stats" -Description "3. Profile Statistics"

# 4. Listar Profiles
Test-Endpoint -Endpoint "/api/profiles" -Description "4. List All Profiles"

# 5. Criar novo profile
$newProfile = @{
    username = "test_api_user"
    tags = @("test", "api")
}
Test-Endpoint -Method "POST" -Endpoint "/api/profiles" -Description "5. Create New Profile" -Body $newProfile

# 6. Listar profiles novamente
Test-Endpoint -Endpoint "/api/profiles" -Description "6. List Profiles (After Creation)"

# 7. Content Stats
Test-Endpoint -Endpoint "/api/content/stats" -Description "7. Content Statistics"

# 8. Analysis Stats
Test-Endpoint -Endpoint "/api/analysis/stats" -Description "8. Analysis Statistics"

# 9. List Analyses
Test-Endpoint -Endpoint "/api/analysis" -Description "9. List All Analyses"

# 10. Upcoming Posts
Test-Endpoint -Endpoint "/api/posts/upcoming" -Description "10. Upcoming Posts"

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "TESTES CONCLUIDOS!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
