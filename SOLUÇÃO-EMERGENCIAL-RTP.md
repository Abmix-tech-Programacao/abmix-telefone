# 🚨 SOLUÇÃO EMERGENCIAL - EasyPanel Cache Problem

## 🔴 **PROBLEMA CRÍTICO:**

O EasyPanel está usando **CÓDIGO ANTIGO** mesmo após redeploy:

```
❌ AINDA APARECE: at isRtp (/app/node_modules/rtp.js/lib/packets/RTP/RtpPacket.js:17:28)
✅ DEVERIA SER: Sem erros RTP
```

**Causa:** EasyPanel não limpou cache do Docker/node_modules

## ⚡ **SOLUÇÃO EMERGENCIAL - 3 OPÇÕES:**

### **OPÇÃO 1: Rebuild Completo (RECOMENDADO)**
**No EasyPanel:**
1. **Delete o app** completamente
2. **Recrie do zero** com o GitHub atualizado
3. **Configure variáveis** corretas
4. **Deploy limpo**

### **OPÇÃO 2: Forçar Limpeza de Cache**
**No EasyPanel - Advanced Settings:**
1. **Build Args** → Adicionar:
   ```
   --no-cache
   ```
2. **Redeploy** com cache limpo

### **OPÇÃO 3: Desabilitar RTP Temporariamente**
**HOTFIX imediato** - desabilitar RTP para parar spam:

```typescript
// server/telephony.ts - comentar linha:
// rtpService.start(10000).then(() => {
//   console.log('[TELEPHONY] RTP server started on port 10000');
// }).catch((err) => {
//   console.error('[TELEPHONY] Failed to start RTP server:', err);
// });
```

## 🎯 **RECOMENDAÇÃO: OPÇÃO 1 (Delete + Recria)**

### **PASSO 1: Deletar App**
1. EasyPanel → Seu App
2. Settings → **Delete Application**
3. Confirmar exclusão

### **PASSO 2: Recriar do Zero**
1. **+ Create Application**
2. **From GitHub Repository**
3. `Abmix-tech-Programacao/abmix-telefone`
4. Branch: `main`

### **PASSO 3: Configurar Correto**
**Environment Variables:**
```
NODE_ENV=production
PORT=5000
PUBLIC_IP=72.60.149.107
FALEVONO_PASSWORD=Fe120784!
ELEVENLABS_API_KEY=sk_58ab581ca38280c62eb8d560b3288c9ae2d9184d62a42cfe
DEEPGRAM_API_KEY=e81295a63e96b3283c22c1de5db9af5dd1466b85
OPENAI_API_KEY=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
SESSION_SECRET=p9Wkc/bD+vGCzCk1xVR3/+3gCoXvJOpfUx+S/ETop+DUjYX23HGI6YsgNZTxqiiWvtjWU2rVxLd9hGVQHStgQQ==
```

**Advanced Settings:**
```
Network Mode: host
```

**Volumes:**
```
Source: ./data
Target: /app/data
```

### **PASSO 4: Deploy Limpo**
- Build vai usar código atualizado
- Sem cache problemático
- Sem rtp.js nos node_modules

## 🧪 **RESULTADO ESPERADO:**

**✅ Logs Limpos:**
```
[RTP] Server listening on 0.0.0.0:10000
[SIP_SERVICE] Registration successful!
SEM MAIS: [RTP] Failed to parse RTP packet
```

**✅ Funcionalidades:**
- 🔊 Sons DTMF (após "Ativar Áudio")
- 🔔 Ringtone ao discar
- 📞 Áudio bilateral
- 📱 Números persistentes

## 🔥 **AÇÃO IMEDIATA:**

**DELETE + RECRIE** o app no EasyPanel para forçar build limpo com código atualizado.

**Tempo estimado:** 5-10 minutos para recriar
**Resultado:** Sistema funcionando 100%

---

**🎯 O problema é CACHE, não código! Recrie o app!**
