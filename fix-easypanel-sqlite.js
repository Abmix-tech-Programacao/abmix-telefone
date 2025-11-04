// Script para limpar banco SQLite no EasyPanel
// Execute dentro do container: node fix-easypanel-sqlite.js
import Database from 'better-sqlite3';

const db = new Database('data/app.db');

console.log('📋 Números atuais no banco:');
const numbers = db.prepare('SELECT id, name, number, sip_username, sip_server FROM voip_numbers').all();
console.table(numbers);

// Remover números com username incorreto (senha ao invés de username)
console.log('\n🗑️  Removendo números com username incorreto...');
const deleteWrongUsername = db.prepare("DELETE FROM voip_numbers WHERE sip_username = 'Fe120784!'").run();
console.log(`✅ ${deleteWrongUsername.changes} número(s) com username errado removido(s)`);

// Atualizar username do número da FaleVono se estiver incorreto
console.log('\n🔧 Corrigindo username do número FaleVono...');
const updateUsername = db.prepare(`
  UPDATE voip_numbers 
  SET sip_username = 'Felipe_Manieri',
      name = 'FaleVono - SP'
  WHERE number = '+5511920838833'
    AND sip_username != 'Felipe_Manieri'
`).run();

if (updateUsername.changes > 0) {
  console.log(`✅ Username corrigido para Felipe_Manieri`);
} else {
  console.log('✅ Username já estava correto');
}

// Verificar se o número existe
const exists = db.prepare("SELECT COUNT(*) as count FROM voip_numbers WHERE number = '+5511920838833'").get();
if (exists.count === 0) {
  console.warn('\n⚠️  ATENÇÃO: Número +5511920838833 não encontrado no banco!');
  console.warn('📌 Por favor, cadastre o número manualmente pela interface web');
}

console.log('\n📋 Números após limpeza:');
const numbersAfter = db.prepare('SELECT id, name, number, sip_username, sip_server, is_default FROM voip_numbers').all();
console.table(numbersAfter);

db.close();
console.log('\n✅ Banco do EasyPanel corrigido com sucesso!');
console.log('📌 Próximo passo: Reinicie a aplicação no EasyPanel');
