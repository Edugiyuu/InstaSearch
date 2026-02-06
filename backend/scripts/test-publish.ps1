# Script para testar publicação de posts

Write-Host "=== Testando Sistema de Agendamento ===" -ForegroundColor Cyan

# 1. Verificar status do scheduler
Write-Host "`n1. Status do Scheduler:" -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "http://localhost:3000/api/scheduler/status" -Method GET
$status | ConvertTo-Json -Depth 3

# 2. Listar posts agendados
Write-Host "`n2. Posts Agendados:" -ForegroundColor Yellow
$posts = Invoke-RestMethod -Uri "http://localhost:3000/api/posts/upcoming" -Method GET
Write-Host "Total de posts agendados: $($posts.data.Count)" -ForegroundColor Green
$posts.data | ForEach-Object {
    Write-Host "  - ID: $($_.id)" -ForegroundColor White
    Write-Host "    Status: $($_.status)" -ForegroundColor $(if ($_.status -eq "scheduled") { "Green" } else { "Red" })
    Write-Host "    Agendado para: $($_.scheduledFor)" -ForegroundColor Cyan
    Write-Host "    Caption: $($_.caption.Substring(0, [Math]::Min(50, $_.caption.Length)))..." -ForegroundColor Gray
    Write-Host ""
}

# 3. Tentar publicar o primeiro post agendado (se existir)
if ($posts.data.Count -gt 0) {
    $postId = $posts.data[0].id
    Write-Host "3. Publicando post $postId..." -ForegroundColor Yellow
    
    try {
        $publishResult = Invoke-RestMethod -Uri "http://localhost:3000/api/scheduler/publish/$postId" -Method POST
        Write-Host "✅ Post publicado com sucesso!" -ForegroundColor Green
        $publishResult | ConvertTo-Json -Depth 3
        
        # Verificar se realmente foi publicado
        Write-Host "`n4. Verificando status do post:" -ForegroundColor Yellow
        $updatedPost = Invoke-RestMethod -Uri "http://localhost:3000/api/posts/$postId" -Method GET
        Write-Host "Status atual: $($updatedPost.data.status)" -ForegroundColor $(if ($updatedPost.data.status -eq "published") { "Green" } else { "Red" })
        
    } catch {
        Write-Host "❌ Erro ao publicar: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host $_.Exception -ForegroundColor Red
    }
} else {
    Write-Host "`n⚠️  Nenhum post agendado encontrado!" -ForegroundColor Yellow
    Write-Host "Crie um post agendado primeiro no frontend." -ForegroundColor Gray
}
