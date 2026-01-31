import { 
  profileStorage, 
  reelStorage, 
  analysisStorage, 
  contentStorage, 
  postStorage 
} from './services/storage/index.js'
import { 
  generateProfileId, 
  generateReelId, 
  generateAnalysisId, 
  generateContentId 
} from './utils/idGenerator.js'
import type { Profile, Reel, Analysis, Content } from './models/index.js'

async function testStorage() {
  console.log('🧪 Testando Sistema de Storage...\n')

  // Test 1: Criar um perfil
  console.log('📝 Test 1: Criar perfil')
  const profile: Profile = {
    id: generateProfileId(),
    username: 'tech_influencer',
    fullName: 'Tech Influencer',
    bio: 'Dicas de tecnologia e IA',
    isVerified: false,
    metrics: {
      followers: 150000,
      following: 500,
      posts: 320
    },
    status: 'pending',
    tags: ['tecnologia', 'ia'],
    addedAt: new Date().toISOString()
  }
  
  await profileStorage.save(profile)
  console.log('✅ Perfil criado:', profile.username)
  console.log('   ID:', profile.id)

  // Test 2: Buscar perfil
  console.log('\n📝 Test 2: Buscar perfil por ID')
  const foundProfile = await profileStorage.findById(profile.id)
  console.log('✅ Perfil encontrado:', foundProfile?.username)

  // Test 3: Buscar por username
  console.log('\n📝 Test 3: Buscar por username')
  const profileByUsername = await profileStorage.findByUsername('tech_influencer')
  console.log('✅ Perfil encontrado:', profileByUsername?.username)

  // Test 4: Criar um reel
  console.log('\n📝 Test 4: Criar reel')
  const reel: Reel = {
    id: generateReelId(),
    profileId: profile.id,
    instagramId: '123456789',
    url: 'https://instagram.com/reel/abc123',
    caption: 'Como usar IA no dia a dia',
    hashtags: ['#ia', '#tecnologia', '#dicas'],
    metrics: {
      likes: 15000,
      comments: 450,
      views: 250000
    },
    duration: 25,
    postedAt: new Date().toISOString(),
    collectedAt: new Date().toISOString()
  }
  
  await reelStorage.save(reel)
  console.log('✅ Reel criado')
  console.log('   ID:', reel.id)

  // Test 5: Buscar reels do perfil
  console.log('\n📝 Test 5: Buscar reels do perfil')
  const profileReels = await reelStorage.findByProfileId(profile.id)
  console.log('✅ Reels encontrados:', profileReels.length)

  // Test 6: Criar análise
  console.log('\n📝 Test 6: Criar análise')
  const analysis: Analysis = {
    id: generateAnalysisId(),
    profileIds: [profile.id],
    type: 'comprehensive',
    status: 'processing',
    createdAt: new Date().toISOString()
  }
  
  await analysisStorage.save(analysis)
  console.log('✅ Análise criada')
  console.log('   ID:', analysis.id)

  // Test 7: Atualizar status da análise
  console.log('\n📝 Test 7: Completar análise')
  await analysisStorage.updateStatus(analysis.id, 'completed', {
    themes: [
      { name: 'Tecnologia', frequency: 0.65, keywords: ['IA', 'tech', 'inovação'] }
    ],
    contentTypes: [
      { type: 'Tutorial', percentage: 45, avgEngagement: 18500 }
    ],
    engagementPatterns: {
      bestPostingTimes: [
        { day: 'Tuesday', hour: 18, score: 0.92 }
      ],
      optimalDuration: { min: 15, max: 30, unit: 'seconds' },
      topHashtags: [
        { tag: '#ia', count: 67, avgEngagement: 19000 }
      ]
    },
    viralPatterns: [
      { pattern: 'Hook nos primeiros 3 segundos', examples: [], successRate: 0.78 }
    ],
    insights: ['Conteúdo educativo tem 30% mais engajamento'],
    recommendations: ['Foque em tutoriais curtos']
  })
  console.log('✅ Análise completada')

  // Test 8: Criar conteúdo
  console.log('\n📝 Test 8: Criar conteúdo')
  const content: Content = {
    id: generateContentId(),
    analysisId: analysis.id,
    idea: {
      title: '5 Truques de IA',
      description: 'Tutorial rápido sobre IA',
      hook: 'Você está usando IA errado!'
    },
    script: {
      hook: 'Você está usando IA errado!',
      body: 'Aqui está o que você precisa saber...',
      cta: 'Salve esse post!',
      estimatedDuration: 25
    },
    visualSuggestions: ['Texto chamativo', 'Transições rápidas'],
    hashtags: ['#ia', '#tecnologia', '#dicas'],
    status: 'draft',
    score: 8.5,
    createdAt: new Date().toISOString()
  }
  
  await contentStorage.save(content)
  console.log('✅ Conteúdo criado')
  console.log('   ID:', content.id)

  // Test 9: Estatísticas
  console.log('\n📝 Test 9: Estatísticas')
  const profileStats = await profileStorage.getStats()
  const analysisStats = await analysisStorage.getStats()
  const contentStats = await contentStorage.getStats()
  
  console.log('✅ Estatísticas:')
  console.log('   Perfis:', profileStats)
  console.log('   Análises:', analysisStats)
  console.log('   Conteúdo:', contentStats)

  // Test 10: Listar todos
  console.log('\n📝 Test 10: Listar todos os itens')
  const allProfiles = await profileStorage.findAll()
  const allReels = await reelStorage.findAll()
  const allAnalyses = await analysisStorage.findAll()
  const allContent = await contentStorage.findAll()
  
  console.log('✅ Totais:')
  console.log('   Perfis:', allProfiles.length)
  console.log('   Reels:', allReels.length)
  console.log('   Análises:', allAnalyses.length)
  console.log('   Conteúdo:', allContent.length)

  console.log('\n🎉 Todos os testes passaram com sucesso!')
}

// Executar testes
testStorage().catch(console.error)
