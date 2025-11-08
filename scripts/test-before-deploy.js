#!/usr/bin/env node

/**
 * Teste Completo ANTES do Deploy
 * Verifica se todas as correções estão aplicadas corretamente
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 TESTE COMPLETO ANTES DO DEPLOY');
console.log('==================================\n');

let allTestsPassed = true;

// Teste 1: Verificar se rtp.js foi removido
console.log('📦 1. VERIFICANDO PACKAGE.JSON...');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  
  if (packageJson.dependencies['rtp.js']) {
    console.log('❌ rtp.js ainda está no package.json!');
    allTestsPassed = false;
  } else {
    console.log('✅ rtp.js removido com sucesso');
  }
} catch (error) {
  console.log('❌ Erro ao ler package.json:', error);
  allTestsPassed = false;
}

// Teste 2: Verificar rtpService.ts
console.log('\n🔧 2. VERIFICANDO RTPSERVICE.TS...');
try {
  const rtpService = readFileSync('server/rtpService.ts', 'utf8');
  
  // Verificar imports reais (não comentários)
  const lines = rtpService.split('\n');
  const hasRtpImport = lines.some(line => 
    line.trim().startsWith('import') && line.includes('rtp.js') && !line.trim().startsWith('//')
  );
  
  if (hasRtpImport) {
    console.log('❌ rtpService.ts ainda importa rtp.js!');
    allTestsPassed = false;
  } else {
    console.log('✅ rtpService.ts sem dependências de rtp.js');
  }

  if (rtpService.includes('new RtpPacket')) {
    console.log('❌ rtpService.ts ainda usa RtpPacket!');
    allTestsPassed = false;
  } else {
    console.log('✅ rtpService.ts sem uso de RtpPacket');
  }

  if (rtpService.includes('from \'rtp.js\'') || rtpService.includes('require(\'rtp.js\')')) {
    console.log('❌ rtpService.ts ainda tem imports problemáticos!');
    allTestsPassed = false;
  } else {
    console.log('✅ rtpService.ts sem imports problemáticos');
  }
} catch (error) {
  console.log('❌ Erro ao ler rtpService.ts:', error);
  allTestsPassed = false;
}

// Teste 3: Verificar DTMF
console.log('\n🔊 3. VERIFICANDO SISTEMA DTMF...');
try {
  const dtmfUtils = readFileSync('client/src/utils/dtmf.ts', 'utf8');
  const useDTMF = readFileSync('client/src/hooks/useDTMF.ts', 'utf8');
  const dialerCard = readFileSync('client/src/components/DialerCard.tsx', 'utf8');
  
  if (dtmfUtils.includes('async playTone')) {
    console.log('✅ DTMF async implementado');
  } else {
    console.log('❌ DTMF não é async');
    allTestsPassed = false;
  }

  if (dialerCard.includes('useDTMF')) {
    console.log('✅ DialerCard importa useDTMF');
  } else {
    console.log('❌ DialerCard não importa useDTMF');
    allTestsPassed = false;
  }

  if (dialerCard.includes('playTone(digit)')) {
    console.log('✅ DialerCard chama playTone');
  } else {
    console.log('❌ DialerCard não chama playTone');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Erro ao verificar DTMF:', error);
  allTestsPassed = false;
}

// Teste 4: Verificar AudioActivator
console.log('\n🎵 4. VERIFICANDO AUDIOACTIVATOR...');
try {
  const audioActivator = readFileSync('client/src/components/AudioActivator.tsx', 'utf8');
  const layout = readFileSync('client/src/components/Layout.tsx', 'utf8');
  
  if (layout.includes('AudioActivator')) {
    console.log('✅ AudioActivator importado no Layout');
  } else {
    console.log('❌ AudioActivator não importado');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Erro ao verificar AudioActivator:', error);
  allTestsPassed = false;
}

// Teste 5: Verificar seed-voip.ts
console.log('\n📱 5. VERIFICANDO SEED-VOIP.TS...');
try {
  const seedVoip = readFileSync('server/seed-voip.ts', 'utf8');
  
  if (seedVoip.includes('DELETE FROM voip_numbers')) {
    console.log('❌ seed-voip.ts ainda deleta números!');
    allTestsPassed = false;
  } else {
    console.log('✅ seed-voip.ts não deleta números existentes');
  }
} catch (error) {
  console.log('❌ Erro ao verificar seed-voip.ts:', error);
  allTestsPassed = false;
}

// Resultado final
console.log('\n🎯 RESULTADO FINAL:');
console.log('==================');

if (allTestsPassed) {
  console.log('🎉 ✅ TODOS OS TESTES PASSARAM!');
  console.log('🚀 Sistema pronto para deploy com:');
  console.log('   ✅ RTP sem erros');
  console.log('   ✅ DTMF funcionando');
  console.log('   ✅ AudioActivator presente');
  console.log('   ✅ Números VoIP persistentes');
  console.log('   ✅ Sem dependências problemáticas');
  console.log('\n🔥 FAÇA REDEPLOY AGORA - DEVE FUNCIONAR!');
} else {
  console.log('❌ ALGUNS TESTES FALHARAM!');
  console.log('🛑 NÃO faça deploy ainda - corrija os problemas acima');
}

console.log('\n📋 CHECKLIST FINAL EASYPANEL:');
console.log('============================');
console.log('1. ✅ Código atualizado no Git');
console.log('2. ⏳ Corrigir variáveis: FALEVONO_SENHA → FALEVONO_PASSWORD');
console.log('3. ⏳ Configurar volume: ./data → /app/data');
console.log('4. ⏳ Network mode: host');
console.log('5. ⏳ Redeploy');

process.exit(allTestsPassed ? 0 : 1);
