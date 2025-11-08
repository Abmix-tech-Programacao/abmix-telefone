# 🔧 Configuração do Replit - Abmix Telefone

## 🎯 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

### **No Replit → Secrets (🔒 aba lateral)**

Adicione estas variáveis **EXATAMENTE** com estes nomes:

```bash
# === CONFIGURAÇÕES BÁSICAS ===
NODE_ENV=production
PORT=5000
PUBLIC_IP=72.60.149.107

# === SIP/TELEFONIA ===
FALEVONO_PASSWORD=Fe120784!
SIP_USERNAME=Felipe_Manieri
SIP_PASSWORD=Fe120784!
SIP_ENABLED=true
SIP_SERVER=vono2.me
SIP_DOMAIN=vono2.me
SIP_PROXY=vono2.me
SIP_PORT=5060
SIP_TRANSPORT=udp
SIP_REALM=vono2.me
FALEVONO_SIP_PORT=6060

# === AI SERVICES ===
ELEVENLABS_API_KEY=sk_sua_chave_elevenlabs_aqui
DEEPGRAM_API_KEY=sua_chave_deepgram_aqui
OPENAI_API_KEY=sk-proj-sua_chave_openai_aqui

# === OUTROS SERVIÇOS ===
SOBREIP_PASSWORD=sua_senha_sobreip
SESSION_SECRET=sua_chave_secreta_longa_e_aleatoria
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_seu_token_github_aqui
```

## 🚨 LIMITAÇÕES DO REPLIT

### ❌ **O que NÃO funciona no Replit:**
- **Chamadas SIP reais** (UDP bloqueado)
- **Áudio RTP** (UDP bloqueado)  
- **Registro SIP** (timeout)
- **DTMF durante chamada** (sem SIP conectado)

### ✅ **O que FUNCIONA no Replit:**
- **Interface web completa** 
- **Sons DTMF do teclado** (Web Audio API)
- **APIs REST** 
- **WebSocket legendas**
- **Desenvolvimento do código**

## 🎯 COMO USAR

### **1. Para Desenvolvimento (Replit):**
```bash
# Inicia apenas a interface
npm run dev

# Acesse: https://seu-repl.replit.dev
# Teste: Interface, botões, sons DTMF
# NÃO TESTE: Chamadas reais (não funcionam)
```

### **2. Para Telefonia Real (EasyPanel):**
```bash
# Deploy no EasyPanel com as mesmas variáveis
# Teste: Chamadas reais, áudio bilateral
```

## 🔧 CONFIGURAÇÃO PASSO A PASSO

### **1. Adicionar Secrets no Replit:**
1. Clique no ícone **🔒 Secrets** (barra lateral)
2. Para cada variável acima:
   - **Key**: Nome exato da variável
   - **Value**: Valor correspondente  
   - Clique **Add Secret**

### **2. Configurar .replit (já configurado):**
```toml
[env]
PORT = "5000"

[[ports]]
localPort = 5000
externalPort = 80
```

### **3. Testar no Replit:**
```bash
# 1. Clique em "Run" 
# 2. Aguarde carregar
# 3. Acesse a URL gerada
# 4. Teste interface e sons DTMF
```

## 🎮 FUNCIONALIDADES DISPONÍVEIS

### ✅ **Interface Completa:**
- Teclado numérico com sons DTMF
- Botão toggle "Sons On/Off"  
- Seleção de voz (masc/fem/natural)
- Controles de chamada (visuais)
- Favoritos e configurações

### ✅ **Sons DTMF:**
- Frequências corretas (697-1633 Hz)
- Toggle liga/desliga persistente
- Envelope ADSR suave
- Funciona em todos os navegadores modernos

### ❌ **Telefonia Real:**
- Chamadas SIP: Apenas no EasyPanel
- Áudio RTP: Apenas no EasyPanel  
- DTMF real: Apenas no EasyPanel

## 📋 CHECKLIST DE CONFIGURAÇÃO

- [ ] Todas as 15+ variáveis adicionadas nos Secrets
- [ ] Aplicação rodando sem erros
- [ ] Interface carrega corretamente
- [ ] Sons DTMF funcionam ao clicar teclas
- [ ] Botão "Sons On/Off" funciona
- [ ] Console sem erros JavaScript

## 🎯 PRÓXIMOS PASSOS

1. **Desenvolver no Replit**: Interface e funcionalidades
2. **Testar telefonia no EasyPanel**: Deploy para VPS
3. **Usar híbrido**: Código no Replit + Telefonia no EasyPanel

---

**💡 Lembre-se:** Replit é perfeito para desenvolvimento, EasyPanel para produção!