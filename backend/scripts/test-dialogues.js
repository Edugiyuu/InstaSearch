/**
 * Script de teste para validar geração de prompts com diálogos
 * 
 * Uso: node scripts/test-dialogues.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testDialogues() {
  console.log('🎬 Testando geração de prompts com diálogos...\n');

  try {
    // Teste 1: Comidas Falantes (Animated)
    console.log('📝 Teste 1: Comidas Falantes (16s, animated)');
    const response1 = await axios.post(`${API_URL}/video-prompts/generate`, {
      topic: 'batalha épica entre pizza e hambúrguer',
      duration: 16,
      style: 'animated',
      dialogues: [
        {
          speaker: 'Pizza',
          text: 'Eu sou a rainha das festas!',
          timing: 'início'
        },
        {
          speaker: 'Hambúrguer',
          text: 'Só se for das festas perdidas!',
          timing: 'meio'
        },
        {
          speaker: 'Sorvete',
          text: 'Vocês dois são muito quentes, EU sou a melhor!',
          timing: 'final'
        }
      ]
    });

    console.log('✅ Prompts gerados com sucesso!');
    console.log(`\nContexto: ${response1.data.data.context}`);
    console.log(`\nPrompt 1:\n${response1.data.data.prompts[0].prompt}`);
    console.log(`\nPrompt 2:\n${response1.data.data.prompts[1].prompt}`);
    console.log(`\nGrok URL: ${response1.data.data.grokUrl}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // Teste 2: Objetos de Escritório Falantes (Comedy)
    console.log('📝 Teste 2: Objetos de Escritório (8s, comedy)');
    const response2 = await axios.post(`${API_URL}/video-prompts/generate`, {
      topic: 'objetos de escritório tendo uma reunião',
      duration: 8,
      style: 'comedy',
      dialogues: [
        {
          speaker: 'Caneta',
          text: 'Essa reunião podia ser um email!',
          timing: 'início'
        },
        {
          speaker: 'Grampeador',
          text: 'Concordo, estou preso aqui!',
          timing: 'meio'
        }
      ]
    });

    console.log('✅ Prompt gerado com sucesso!');
    console.log(`\nContexto: ${response2.data.data.context}`);
    console.log(`\nPrompt:\n${response2.data.data.prompts[0].prompt}`);
    console.log(`\nGrok URL: ${response2.data.data.grokUrl}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // Teste 3: Sem diálogos (para comparação)
    console.log('📝 Teste 3: Sem Diálogos (8s, meme)');
    const response3 = await axios.post(`${API_URL}/video-prompts/generate`, {
      topic: 'gato tentando trabalhar mas só quer dormir',
      duration: 8,
      style: 'meme'
    });

    console.log('✅ Prompt gerado com sucesso!');
    console.log(`\nContexto: ${response3.data.data.context}`);
    console.log(`\nPrompt:\n${response3.data.data.prompts[0].prompt}`);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('🎉 Todos os testes passaram!');
    console.log('\n💡 Dica: Copie os prompts e teste no Grok Video!');
    console.log('🔗 https://grok.com/imagine\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Executar testes
testDialogues();
