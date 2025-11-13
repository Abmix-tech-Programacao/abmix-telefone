# Comandos de Validação - VPS

## 1. Verificar se o código foi atualizado no container

```bash
SVC=projeto-abmix-tech_abmix-telefone
APP_CID=$(docker ps -q --filter name=$SVC)

# Verifica logs de inicialização (deve mostrar upgrade handlers)
docker logs "$APP_CID" --since 5m | grep -E "MEDIA_UPGRADE|CAPTIONS_UPGRADE|WebSocket servers|HTTP/WS on"
```

**Resultado esperado:**
- Deve aparecer `[MEDIA_UPGRADE]` ou `[CAPTIONS_UPGRADE]` nos logs
- Deve aparecer `[express] HTTP/WS on 5000`

---

## 2. Teste WebSocket interno (dentro do container)

```bash
APP_CID=$(docker ps -q --filter name=$SVC)

# Instala websocat se necessário
docker exec -it "$APP_CID" sh -lc 'apk add --no-cache websocat 2>/dev/null || (apt-get update && apt-get install -y websocat) || true'

# Testa /media (deve dar 101 Switching Protocols, NÃO 400)
docker exec -it "$APP_CID" sh -lc 'websocat -vv ws://localhost:5000/media'

# Testa /ws-media (deve dar 101)
docker exec -it "$APP_CID" sh -lc 'websocat -vv ws://localhost:5000/ws-media'

# Testa /captions (deve dar 101)
docker exec -it "$APP_CID" sh -lc 'websocat -vv ws://localhost:5000/captions'
```

**Resultado esperado:**
- Todos devem conectar (101 Switching Protocols)
- NÃO deve aparecer "400 Bad Request"

---

## 3. Teste WebSocket via domínio (através do Traefik)

```bash
# Testa /media via HTTPS
docker run --rm -it ghcr.io/vi/websocat:latest wss://telefone.abmix.tech/media

# Testa /ws-media via HTTPS
docker run --rm -it ghcr.io/vi/websocat:latest wss://telefone.abmix.tech/ws-media

# Testa /captions via HTTPS
docker run --rm -it ghcr.io/vi/websocat:latest wss://telefone.abmix.tech/captions
```

**Resultado esperado:**
- Todos devem conectar (101 Switching Protocols)
- NÃO deve aparecer "400 Bad Request"

---

## 4. Verificar logs do Traefik (se ainda der 400)

```bash
TRAEFIK_CID=$(docker ps -q --filter name=traefik)

# Últimas 200 linhas do Traefik
docker logs "$TRAEFIK_CID" --since 5m | tail -n 200

# Filtrar apenas erros e requisições /media
docker logs "$TRAEFIK_CID" --since 5m | grep -E "error|/media|upgrade" | tail -n 100
```

**Resultado esperado:**
- Não deve aparecer erros relacionados a "upgrade" ou "websocket"
- Requisições para `/media` devem aparecer como 101 ou 200, não 400

---

## 5. Verificar logs da aplicação (debug)

```bash
APP_CID=$(docker ps -q --filter name=$SVC)

# Logs completos dos últimos 5 minutos
docker logs "$APP_CID" --since 5m | tail -n 300

# Filtrar apenas logs de WebSocket
docker logs "$APP_CID" --since 5m | grep -E "WS|MEDIA|CAPTIONS|upgrade" | tail -n 100
```

**Resultado esperado:**
- Deve aparecer `[MEDIA_UPGRADE] Aceito upgrade para /media` quando conectar
- Deve aparecer `[CAPTIONS_UPGRADE] Aceito upgrade para /captions` quando conectar

---

## 6. Teste completo de chamada (no navegador)

1. Abra `https://telefone.abmix.tech` no navegador
2. Abra o DevTools (F12) → Console
3. Faça uma chamada de teste
4. Verifique no console:
   - `[AUDIO_PLAYER] ✅ WebSocket conectado` (não deve aparecer erro)
   - `[RINGTONE] Ringtone started` quando começar a tocar
   - `[RINGTONE] Media opened, stopping ringtone` quando mídia abrir
   - `[AUDIO_MONITOR]` não deve aparecer erro "e is not a function"
   - Barras de volume devem se mover (não travadas)

---

## 7. Se ainda der 400 após rebuild

Execute este comando para verificar se o middleware está funcionando:

```bash
APP_CID=$(docker ps -q --filter name=$SVC)

# Verifica se o arquivo index.js compilado tem o middleware de upgrade
docker exec -it "$APP_CID" sh -lc 'grep -r "upgrade.*websocket" /app/dist 2>/dev/null | head -n 5 || echo "Middleware não encontrado no código compilado"'
```

---

## Resumo dos Problemas Corrigidos

✅ **Catch-all Routes** - `app.get("*")` e `app.use("*")` agora ignoram requisições de upgrade WebSocket (CAUSA DO 400)
✅ **Middleware Express** - Ignora requisições de upgrade WebSocket antes de processar
✅ **Ringtone** - Para automaticamente quando `window.__mediaOpen` fica `true`
✅ **AudioMonitor** - Tratamento de erro melhorado para evitar "e is not a function"
✅ **WebSocket Upgrade** - Handler único `noServer` para `/media`, `/ws-media` e `/captions`

---

## Próximos Passos

1. **No EasyPanel:** Faça "Rebuild WITHOUT CACHE"
2. **Aguarde** o build terminar
3. **Execute** os comandos de validação acima
4. **Teste** uma chamada real no navegador

Se ainda houver problemas, envie os logs completos dos comandos 4 e 5.

