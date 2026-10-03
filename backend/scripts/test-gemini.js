/**
 * Script para testar conexão com Google Gemini API
 * Execute: node scripts/test-gemini.js
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testGemini() {
  console.log('🔍 Testando Google Gemini API...\n');

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
    console.error('❌ GEMINI_API_KEY não configurada no .env');
    console.log('Configure em: https://aistudio.google.com/app/apikey\n');
    process.exit(1);
  }

  console.log('✅ API Key encontrada');
  console.log('📊 Modelo:', process.env.GEMINI_MODEL || 'gemini-2.5-flash', '\n');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' 
    });

    // Teste 1: Chamada simples
    console.log('💬 Teste 1: Chamada básica...');
    const result = await model.generateContent('Responda apenas: OK');
    console.log('✅', result.response.text().trim());

    // Teste 2: Análise de conteúdo
    console.log('\n🎯 Teste 2: Análise de conteúdo...');
    const analysis = await model.generateContent(
      'Analise em 1 linha: Tutorial de maquiagem com produtos acessíveis'
    );
    console.log('✅', analysis.response.text().trim());

    // Teste 3: Geração estruturada
    console.log('\n📋 Teste 3: Geração de hashtags...');
    const hashtags = await model.generateContent(
      'Gere 3 hashtags para: café da manhã saudável (apenas hashtags, sem explicação)'
    );
    console.log('✅', hashtags.response.text().trim());

    // Sucesso
    console.log('\n✨ SUCESSO! Gemini funcionando perfeitamente!');
    console.log('💰 100% GRATUITO | 🎯 1,500 requests/dia');
    console.log('\n🚀 Próximos passos:');
    console.log('   1. ✅ Gemini configurado');
    console.log('   2. Implementar AIService.ts');
    console.log('   3. Criar endpoints de análise\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('🔑 Gere nova chave em: https://aistudio.google.com/app/apikey');
    } else if (error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log('⏱️ Limite excedido. Aguarde 1 minuto.');
    } else if (error.message.includes('model not found')) {
      console.log('🤖 Use: gemini-2.5-flash no .env');
    }
    
    console.log('📖 Consulte: docs/AI.md\n');
    process.exit(1);
  }
}

testGemini();

