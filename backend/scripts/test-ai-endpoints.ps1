# Testar AI Endpoints

# 1. Health check da IA
Write-Host "`n=== 1. Health Check da IA ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/health" -Method Get
$response | ConvertTo-Json -Depth 3

# 2. Analisar perfil do Instagram
Write-Host "`n=== 2. Análise de Perfil ===" -ForegroundColor Cyan
$profileData = @{
    profileData = @{
        username = "makeup_artist"
        bio = "Maquiadora profissional | Tutoriais diários | Produtos acessíveis"
        followersCount = 15000
        followingCount = 500
        postsCount = 250
        posts = @(
            @{
                caption = "Tutorial de maquiagem natural para o dia a dia"
                likesCount = 450
                commentsCount = 23
                type = "reel"
            },
            @{
                caption = "Produtos de farmácia que realmente funcionam"
                likesCount = 680
                commentsCount = 45
                type = "post"
            }
        )
    }
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/analyze-profile" -Method Post -Body $profileData -ContentType "application/json"
$response | ConvertTo-Json -Depth 5

# 3. Gerar caption
Write-Host "`n=== 3. Gerar Caption ===" -ForegroundColor Cyan
$captionData = @{
    contentIdea = "Tutorial de maquiagem para iniciantes com produtos de farmácia"
    tone = "casual"
    includeHashtags = $true
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/generate-caption" -Method Post -Body $captionData -ContentType "application/json"
$response | ConvertTo-Json -Depth 5

# 4. Analisar hashtags
Write-Host "`n=== 4. Análise de Hashtags ===" -ForegroundColor Cyan
$hashtagData = @{
    hashtags = @(
        "#maquiagem"
        "#makeup"
        "#beleza"
        "#tutorial"
        "#makeupbrasil"
    )
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/analyze-hashtags" -Method Post -Body $hashtagData -ContentType "application/json"
$response | ConvertTo-Json -Depth 5

Write-Host "`n✅ Todos os testes concluídos!" -ForegroundColor Green
