# Script de teste para API InstaSearch

function Test-API {
    param([string]$Endpoint, [string]$Method = "GET", [object]$Body = $null)
    
    $uri = "http://localhost:3000$Endpoint"
    Write-Host "`n$Method $Endpoint" -ForegroundColor Yellow
    
    try {
        if ($Method -eq "POST" -and $Body) {
            $json = $Body | ConvertTo-Json
            $result = Invoke-RestMethod -Uri $uri -Method $Method -Body $json -ContentType "application/json"
        } else {
            $result = Invoke-RestMethod -Uri $uri -Method $Method
        }
        Write-Host "OK" -ForegroundColor Green
        $result | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "TESTANDO API INSTASEARCH" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Start-Sleep -Seconds 1

Test-API -Endpoint "/api/health"
Test-API -Endpoint "/api/dashboard/overview"
Test-API -Endpoint "/api/profiles/stats"
Test-API -Endpoint "/api/profiles"
Test-API -Endpoint "/api/profiles" -Method "POST" -Body @{ username = "api_test_user"; tags = @("test") }
Test-API -Endpoint "/api/content/stats"
Test-API -Endpoint "/api/analysis/stats"
Test-API -Endpoint "/api/posts/upcoming"

Write-Host "`n================================" -ForegroundColor Green
Write-Host "TESTES FINALIZADOS" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
