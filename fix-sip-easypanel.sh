#!/bin/bash
# Script para corrigir o bug do SIP no EasyPanel
# Execute no VPS: bash fix-sip-easypanel.sh

CONTAINER="projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma"

echo "🔧 Corrigindo import do módulo SIP..."

# Backup do arquivo original
docker exec $CONTAINER cp /app/server/sipService.ts /app/server/sipService.ts.backup

# Corrigir a linha problemática (remover .default)
docker exec $CONTAINER sh -c "sed -i 's/const sip = require('\''sip'\'').default || require('\''sip'\'');/const sip = require('\''sip'\'');/g' /app/server/sipService.ts"

echo "✅ Arquivo corrigido"

echo "🔨 Rebuild do TypeScript..."
docker exec $CONTAINER npm run build

echo "🔄 Reiniciando aplicação..."
docker restart $CONTAINER

echo "⏳ Aguardando container reiniciar (30 segundos)..."
sleep 30

echo "📋 Verificando logs..."
docker logs $CONTAINER --tail 50 | grep -E "SIP_MODULE|Username|Registration" || echo "Aguarde mais alguns segundos e rode: docker logs $CONTAINER --tail 50"

echo ""
echo "✅ Correção aplicada!"
echo "📌 Verifique os logs acima para confirmar:"
echo "   - ✅ [SIP_MODULE] ✅ SIP module loaded successfully"
echo "   - ✅ Username: Felipe_Manieri"
echo ""
echo "❌ Se ainda aparecer 'sip.send is not a function', rode novamente este script"
