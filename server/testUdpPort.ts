import dgram from 'dgram';

/**
 * Teste específico da porta UDP 10000
 * Verifica se consegue receber dados na porta configurada
 */

console.log('🧪 TESTE ESPECÍFICO - PORTA UDP 10000');
console.log('====================================');

const testSocket = dgram.createSocket('udp4');

testSocket.on('error', (err) => {
  console.log('❌ Erro no socket UDP:', err);
  process.exit(1);
});

testSocket.on('message', (msg, rinfo) => {
  console.log(`✅ RECEBIDO: ${msg.length} bytes de ${rinfo.address}:${rinfo.port}`);
  console.log(`📄 Dados: ${msg.toString('hex').substring(0, 32)}...`);
});

testSocket.on('listening', () => {
  const address = testSocket.address();
  console.log(`✅ Socket UDP escutando em ${address.address}:${address.port}`);
  
  // Enviar dados de teste para si mesmo
  setTimeout(() => {
    const testData = Buffer.from('TESTE_UDP_PORT_10000');
    testSocket.send(testData, 10000, 'localhost', (err) => {
      if (err) {
        console.log('❌ Erro enviando teste:', err);
      } else {
        console.log('📤 Dados de teste enviados para localhost:10000');
      }
    });
  }, 1000);
  
  // Fechar após 5 segundos
  setTimeout(() => {
    console.log('🔄 Fechando teste UDP...');
    testSocket.close();
    process.exit(0);
  }, 5000);
});

console.log('🔍 Tentando bind na porta 10000...');
testSocket.bind(10000, '0.0.0.0');
