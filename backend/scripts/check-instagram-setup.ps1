# Script para verificar configuração do Instagram

Write-Host "=== Verificando Configuração do Instagram ===" -ForegroundColor Cyan

# 1. Verificar se tem conta conectada
Write-Host "`n1. Conta do Instagram:" -ForegroundColor Yellow
$accounts = Get-ChildItem -Path "data\instagram_accounts" -Filter "*.json" -ErrorAction SilentlyContinue

if ($accounts.Count -eq 0) {
    Write-Host "❌ NENHUMA CONTA CONECTADA!" -ForegroundColor Red
    Write-Host "`nVocê precisa:" -ForegroundColor Yellow
    Write-Host "  1. Criar conta no Facebook Developer: https://developers.facebook.com" -ForegroundColor Gray
    Write-Host "  2. Criar um App com permissões do Instagram" -ForegroundColor Gray
    Write-Host "  3. Conectar sua conta no frontend da aplicação" -ForegroundColor Gray
} else {
    Write-Host "✅ Conta(s) conectada(s): $($accounts.Count)" -ForegroundColor Green
    
    foreach ($accountFile in $accounts) {
        $account = Get-Content $accountFile.FullName | ConvertFrom-Json
        Write-Host "`n  Username: @$($account.username)" -ForegroundColor Cyan
        Write-Host "  Account ID: $($account.accountId)" -ForegroundColor Gray
        Write-Host "  Token válido: $(if ($account.accessToken) { '✅ Sim' } else { '❌ Não' })" -ForegroundColor $(if ($account.accessToken) { 'Green' } else { 'Red' })
        Write-Host "  Conectado em: $($account.connectedAt)" -ForegroundColor Gray
    }
}

# 2. Verificar Cloudinary
Write-Host "`n`n2. Cloudinary (Upload de vídeos):" -ForegroundColor Yellow
$envFile = Get-Content ".env" -Raw
if ($envFile -match "CLOUDINARY_CLOUD_NAME=(.+)") {
    if ($Matches[1] -and $Matches[1] -ne "") {
        Write-Host "✅ Cloudinary configurado: $($Matches[1])" -ForegroundColor Green
    } else {
        Write-Host "❌ CLOUDINARY_CLOUD_NAME vazio!" -ForegroundColor Red
        Write-Host "  Configure em: https://cloudinary.com" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Cloudinary não configurado!" -ForegroundColor Red
}

# 3. Verificar posts agendados
Write-Host "`n`n3. Posts Agendados:" -ForegroundColor Yellow
try {
    $posts = Invoke-RestMethod -Uri "http://localhost:3000/api/posts/upcoming" -Method GET
    $scheduledPosts = $posts.data | Where-Object { $_.status -eq "scheduled" }
    
    if ($scheduledPosts.Count -eq 0) {
        Write-Host "⚠️  Nenhum post agendado" -ForegroundColor Yellow
    } else {
        Write-Host "✅ $($scheduledPosts.Count) post(s) agendado(s)" -ForegroundColor Green
        
        foreach ($post in $scheduledPosts) {
            Write-Host "`n  Post ID: $($post.id)" -ForegroundColor Cyan
            Write-Host "  Agendado para: $($post.scheduledFor)" -ForegroundColor Gray
            Write-Host "  Tem vídeo: $(if ($post.media.videoUrl) { '✅ Sim' } else { '❌ Não' })" -ForegroundColor $(if ($post.media.videoUrl) { 'Green' } else { 'Red' })
        }
    }
} catch {
    Write-Host "⚠️  Backend não está rodando" -ForegroundColor Yellow
}

Write-Host "`n`n=== Resumo ===" -ForegroundColor Cyan
if ($accounts.Count -gt 0 -and ($envFile -match "CLOUDINARY_CLOUD_NAME=(.+)") -and $Matches[1] -ne "") {
    Write-Host "✅ TUDO CONFIGURADO! Pronto para publicar no Instagram!" -ForegroundColor Green
    Write-Host "`nPróximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Agende um post com vídeo" -ForegroundColor Gray
    Write-Host "  2. Aguarde o horário ou clique em 'Publicar Agora'" -ForegroundColor Gray
    Write-Host "  3. Verifique seu perfil do Instagram!" -ForegroundColor Gray
} else {
    Write-Host "⚠️  CONFIGURAÇÃO INCOMPLETA" -ForegroundColor Red
    Write-Host "`nO que falta:" -ForegroundColor Yellow
    if ($accounts.Count -eq 0) {
        Write-Host "  ❌ Conectar conta do Instagram" -ForegroundColor Red
    }
    if (-not ($envFile -match "CLOUDINARY_CLOUD_NAME=(.+)") -or $Matches[1] -eq "") {
        Write-Host "  ❌ Configurar Cloudinary" -ForegroundColor Red
    }
}
