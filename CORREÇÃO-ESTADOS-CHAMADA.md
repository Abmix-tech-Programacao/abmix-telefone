# 🔧 CORREÇÃO: Estados de Chamada Não Sincronizados

## 🚨 **PROBLEMA IDENTIFICADO:**

### **Backend (Logs):**
```
✅ [SIP_SERVICE] Call Answered!
✅ [SIP_SERVICE] Creating RTP session
```

### **Frontend:**
```
❌ callState permanece 'RINGING'
❌ Ringtone não para
❌ Interface não atualiza para 'CONNECTED'
```

## 🔧 **CAUSA:**
**Não há comunicação** Backend → Frontend sobre mudança de estado da chamada.

## ⚡ **SOLUÇÃO - Adicionar WebSocket de Estado:**

### **1. No DialerCard.tsx - Adicionar listener:**

```typescript
// Após os outros useEffect, adicionar:
useEffect(() => {
  if (!currentCallId) return;

  const handleCallStateUpdate = (event: any) => {
    const { callId, state } = event.detail;
    if (callId === currentCallId) {
      console.log(`[DIALER] Call state updated: ${state}`);
      setCallState(state);
    }
  };

  window.addEventListener('callStateUpdate', handleCallStateUpdate);
  return () => window.removeEventListener('callStateUpdate', handleCallStateUpdate);
}, [currentCallId, setCallState]);
```

### **2. No Backend - Emitir eventos de estado:**

**server/sipService.ts - Na função que processa respostas SIP:**

```typescript
// Quando chamada é atendida (status 200):
case 200:
  if (message.headers.cseq.method === 'INVITE') {
    console.log(`[SIP_SERVICE] ✅ Call ${callId}: Answered!`);
    call.status = 'answered';
    
    // ADICIONAR: Notificar frontend
    const event = new CustomEvent('callStateUpdate', {
      detail: { callId, state: 'CONNECTED' }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
```

## 🎯 **RESULTADO ESPERADO:**

Após correção:
- ✅ **Ringtone para** quando atende
- ✅ **Interface atualiza** para "Conectado"
- ✅ **Estado sincronizado** Backend ↔ Frontend

---

**Para aplicar essas correções, mude para modo Agent!**
