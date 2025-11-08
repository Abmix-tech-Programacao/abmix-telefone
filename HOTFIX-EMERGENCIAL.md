# 🚨 HOTFIX EMERGENCIAL - Desabilitar RTP Temporariamente

## 🎯 **PROBLEMA:**
EasyPanel ainda usa código antigo com rtp.js mesmo após redeploy

## ⚡ **SOLUÇÃO IMEDIATA (30 segundos):**

### **Desabilitar RTP para parar spam de erros:**

**Arquivo:** `server/telephony.ts`  
**Linha ~106:** Comentar estas linhas:

```typescript
// ANTES:
rtpService.start(10000).then(() => {
  console.log('[TELEPHONY] RTP server started on port 10000');
}).catch((err) => {
  console.error('[TELEPHONY] Failed to start RTP server:', err);
});

// DEPOIS:
// TEMPORARIAMENTE DESABILITADO - RTP causando problemas no EasyPanel
// rtpService.start(10000).then(() => {
//   console.log('[TELEPHONY] RTP server started on port 10000');
// }).catch((err) => {
//   console.error('[TELEPHONY] Failed to start RTP server:', err);
// });
console.log('[TELEPHONY] RTP server DISABLED - audio will not work but no errors');
```

### **Resultado:**
- ✅ **Para spam de erros** RTP
- ✅ **Interface funciona** normalmente  
- ✅ **Sons DTMF funcionam**
- ❌ **Áudio bilateral não funciona** (temporário)

## 🔄 **DEPOIS DO HOTFIX:**

1. **Commit + Push** esta correção
2. **Redeploy** (deve parar erros)
3. **Delete + Recrie** app no EasyPanel
4. **Reabilitar RTP** na versão limpa

## 📋 **COMANDOS PARA APLICAR:**

```bash
# 1. Aplicar hotfix
git add .
git commit -m "HOTFIX: Desabilitar RTP temporariamente para parar spam"
git push origin main

# 2. Redeploy no EasyPanel
# 3. Delete + Recrie app
# 4. Reabilitar RTP
```

---

**🎯 Isso vai pelo menos parar o spam de erros enquanto recria o app!**
