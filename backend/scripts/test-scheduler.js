// Script para testar o sistema de agendamento
// Execute: node test-scheduler.js

const API_BASE = 'http://localhost:3000/api'

async function testScheduler() {
  console.log('🧪 Testando Sistema de Agendamento\n')

  try {
    // 1. Verificar status do scheduler
    console.log('1️⃣ Verificando status do scheduler...')
    const statusRes = await fetch(`${API_BASE}/scheduler/status`)
    const status = await statusRes.json()
    console.log('Status:', status.data)
    console.log('✅ Scheduler está', status.data.running ? 'ATIVO' : 'INATIVO')
    console.log('')

    // 2. Criar posts de teste
    console.log('2️⃣ Criando posts de teste...')
    
    const now = new Date()
    const posts = [
      {
        caption: '🚀 Post de teste #1 - Agendado para daqui a 2 minutos',
        scheduledFor: new Date(now.getTime() + 2 * 60000).toISOString(),
        media: { type: 'post' }
      },
      {
        caption: '🎯 Post de teste #2 - Agendado para daqui a 5 minutos',
        scheduledFor: new Date(now.getTime() + 5 * 60000).toISOString(),
        media: { type: 'reel' }
      },
      {
        caption: '💡 Post de teste #3 - Agendado para amanhã',
        scheduledFor: new Date(now.getTime() + 24 * 60 * 60000).toISOString(),
        media: { type: 'post' }
      }
    ]

    for (const post of posts) {
      const res = await fetch(`${API_BASE}/posts/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      })
      const result = await res.json()
      
      if (result.success) {
        console.log(`✅ Post criado: ${result.data.id}`)
        console.log(`   Agendado para: ${new Date(result.data.scheduledFor).toLocaleString('pt-BR')}`)
      } else {
        console.log(`❌ Erro ao criar post:`, result.error)
      }
    }
    console.log('')

    // 3. Listar posts agendados
    console.log('3️⃣ Listando posts agendados...')
    const upcomingRes = await fetch(`${API_BASE}/posts/upcoming?limit=10`)
    const upcoming = await upcomingRes.json()
    
    console.log(`Total de posts agendados: ${upcoming.data.length}`)
    upcoming.data.forEach((post, i) => {
      const date = new Date(post.scheduledFor)
      console.log(`   ${i + 1}. ${post.id} - ${date.toLocaleString('pt-BR')}`)
      console.log(`      ${post.caption.substring(0, 50)}...`)
    })
    console.log('')

    // 4. Testar publicação imediata (opcional)
    console.log('4️⃣ Deseja testar publicação imediata? (Não implementado neste script)')
    console.log('   Use: POST /api/scheduler/publish/:id')
    console.log('')

    // 5. Verificar status novamente
    console.log('5️⃣ Verificando status atualizado...')
    const statusRes2 = await fetch(`${API_BASE}/scheduler/status`)
    const status2 = await statusRes2.json()
    console.log('✅ Posts agendados:', status2.data.upcomingPosts)
    if (status2.data.nextScheduled) {
      console.log('⏰ Próximo post:', new Date(status2.data.nextScheduled).toLocaleString('pt-BR'))
    }
    console.log('')

    console.log('✅ Teste concluído com sucesso!')
    console.log('\n📝 Próximos passos:')
    console.log('   1. Abra o frontend em http://localhost:5173')
    console.log('   2. Vá para a página "Calendário"')
    console.log('   3. Veja os posts agendados')
    console.log('   4. Aguarde os posts serem publicados automaticamente')
    console.log('\n⚠️  Nota: A publicação real no Instagram ainda precisa ser implementada')
    console.log('   Por enquanto, os posts mudarão de status mas não serão publicados de verdade.')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.log('\n🔍 Verifique se:')
    console.log('   - O backend está rodando em http://localhost:3000')
    console.log('   - O scheduler foi iniciado corretamente')
  }
}

// Executar teste
testScheduler()
