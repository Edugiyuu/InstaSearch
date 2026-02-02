import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { nanoid } from 'nanoid'

// Token gerado no Meta for Developers
const ACCESS_TOKEN = 'EAATr6RZCzzIwBQtiVe2E7iy1WgZCqEKDidJSK9PnhGa22lzj9t8mI9p8L7eyFwJT5klx0C2SgWH9IaJxI1UmZBCFL3l1ceuge8684TZBBS3JZCJbphIVJFbxzjvKarh9qfIfYwNRmjbaqZBY8sHJBMOB8b9k7yNw7jQxe4kbKL57W0zmUvpwFQ8kqmWNR8zzeP'

// Instagram Business Account ID (encontrado via Graph API Explorer)
const INSTAGRAM_ACCOUNT_ID = '928238559709510'

const dataDir = path.join(process.cwd(), 'data', 'instagram_accounts')

async function ensureDir() {
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

async function addToken() {
  try {
    console.log('🔍 Buscando Instagram Business Account...')
    
    // Primeiro, buscar a página e seu Instagram Business Account
    const pageResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      params: {
        access_token: ACCESS_TOKEN
      }
    })

    console.log('📄 Páginas encontradas:', pageResponse.data.data.length)
    
    // Pegar a primeira página (ou você pode escolher)
    const page = pageResponse.data.data[0]
    console.log('📄 Usando página:', page.name)
    
    // Buscar o Instagram Business Account vinculado
    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: ACCESS_TOKEN
      }
    })

    if (!igResponse.data.instagram_business_account) {
      console.error('❌ Esta página não tem Instagram Business Account vinculado!')
      console.log('   Vincule seu Instagram na página do Facebook primeiro.')
      return
    }

    const igAccountId = igResponse.data.instagram_business_account.id
    console.log('✅ Instagram Account ID encontrado:', igAccountId)
    
    // Agora buscar informações do perfil Instagram
    const profileResponse = await axios.get(`https://graph.facebook.com/v18.0/${igAccountId}`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
        access_token: ACCESS_TOKEN
      }
    })

    const profile = profileResponse.data
    console.log('✅ Perfil Instagram encontrado:', profile)

    await ensureDir()

    // Criar conta
    const account = {
      id: 'igacc_' + nanoid(10),
      userId: 'default_user',
      username: profile.username,
      accountId: profile.id,
      accessToken: ACCESS_TOKEN,
      tokenType: 'user',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
      profile: {
        name: profile.name || profile.username,
        profilePictureUrl: profile.profile_picture_url,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count
      },
      status: 'connected',
      connectedAt: new Date().toISOString()
    }

    // Verificar se já existe
    const files = await fs.readdir(dataDir)
    let existingFile = null
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(dataDir, file), 'utf-8')
        const data = JSON.parse(content)
        if (data.userId === 'default_user') {
          existingFile = file
          account.id = data.id
          break
        }
      }
    }

    // Salvar
    const filePath = path.join(dataDir, `${account.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(account, null, 2), 'utf-8')

    if (existingFile) {
      console.log('✅ Conta atualizada com sucesso!')
    } else {
      console.log('✅ Conta adicionada com sucesso!')
    }

    console.log('\n📱 Dados salvos:')
    console.log('   Username:', account.username)
    console.log('   Account ID:', account.accountId)
    console.log('   Status: connected')
    console.log('   Arquivo:', filePath)
    console.log('\n🎉 Agora você pode acessar http://localhost:5173/settings e ver sua conta conectada!')

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message)
    
    if (error.response?.status === 400) {
      console.log('\n⚠️ O token pode estar inválido ou expirado.')
      console.log('   Gere um novo token em: https://developers.facebook.com/tools/explorer/')
    }
  }
}

addToken()
