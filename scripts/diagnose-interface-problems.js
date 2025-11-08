#!/usr/bin/env node

/**
 * Diagnóstico de Problemas de Interface - "Tudo Tremendo"
 * Identifica possíveis causas de instabilidade visual/funcional
 */

console.log('🔍 DIAGNÓSTICO: Problemas de Interface ("Tudo Tremendo")');
console.log('=====================================================\n');

console.log('🚨 POSSÍVEIS CAUSAS DO PROBLEMA:');
console.log('================================');

console.log('\n1. ❌ CONFLITO DE CSS/ANIMAÇÕES:');
console.log('   → Múltiplas animações rodando simultaneamente');
console.log('   → Transições CSS conflitantes');
console.log('   → Z-index sobreposto');

console.log('\n2. ❌ JAVASCRIPT ERRORS:');
console.log('   → Console.log cheio de erros');
console.log('   → React re-renders infinitos');
console.log('   → WebSocket reconectando em loop');

console.log('\n3. ❌ PERFORMANCE ISSUES:');
console.log('   → AudioContext criando múltiplas instâncias');
console.log('   → Timers/intervals não limpos');
console.log('   → Memory leaks em componentes');

console.log('\n4. ❌ PROBLEMAS DE ESTADO:');
console.log('   → Zustand store com updates excessivos');
console.log('   → UseEffect sem cleanup');
console.log('   → Event listeners acumulando');

console.log('\n🔧 SOLUÇÕES IMEDIATAS:');
console.log('=====================');

console.log('\n📋 1. VERIFICAR CONSOLE DO NAVEGADOR:');
console.log('   • Abra F12 → Console');
console.log('   • Procure por erros vermelhos');
console.log('   • Anote mensagens repetitivas');

console.log('\n📋 2. DESABILITAR ANIMAÇÕES TEMPORARIAMENTE:');
console.log('   • Adicione no CSS: * { animation: none !important; }');
console.log('   • Teste se para de "tremer"');

console.log('\n📋 3. VERIFICAR WEBSOCKET:');
console.log('   • F12 → Network → WS');
console.log('   • Ver se está reconectando constantemente');
console.log('   • Status: Connected vs Connecting loop');

console.log('\n📋 4. TESTAR SEM AUDIO:');
console.log('   • Desabilitar AudioMonitor temporariamente');
console.log('   • Comentar linha: <AudioMonitor /> no Layout.tsx');

console.log('\n🔍 ARQUIVOS SUSPEITOS:');
console.log('=====================');
console.log('• AudioMonitor.tsx - Pode estar criando múltiplos contextos');
console.log('• VolumeMeters.tsx - Animation frames podem estar em loop');
console.log('• Header.tsx - Sliders podem estar causando re-renders');
console.log('• captions.ts - WebSocket pode estar reconectando');

console.log('\n🧪 TESTE DE ISOLAMENTO:');
console.log('======================');
console.log('1. Comentar <AudioMonitor /> no Layout.tsx');
console.log('2. Recarregar página');
console.log('3. Se parar de tremer → problema no AudioMonitor');
console.log('4. Se continuar tremendo → problema em outro componente');

console.log('\n⚡ CORREÇÃO RÁPIDA - DESABILITAR AUDIO:');
console.log('====================================');
console.log('// Layout.tsx - linha 112');
console.log('// {/* <AudioMonitor /> */}  // ← Comentar esta linha');

console.log('\n📞 LOGS DO EASYPANEL PARA VERIFICAR:');
console.log('==================================');
console.log('Procure por estas mensagens nos logs:');
console.log('❌ "[AUDIO_MONITOR] Failed to setup audio monitoring"');
console.log('❌ "[WEBSOCKET] Connection failed"');  
console.log('❌ "WebSocket connection to \'wss://...\' failed"');
console.log('❌ "Maximum call stack size exceeded"');

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('==================');
console.log('1. Verificar console do navegador (F12)');
console.log('2. Desabilitar AudioMonitor temporariamente');
console.log('3. Verificar logs do EasyPanel');
console.log('4. Testar sem componentes de áudio');

console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
console.log('Me envie os erros do console (F12) para diagnóstico preciso.');
