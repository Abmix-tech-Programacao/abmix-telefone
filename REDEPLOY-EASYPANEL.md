# 🚀 Como Fazer Redeploy no EasyPanel

## Problema Atual
O EasyPanel está rodando código antigo com o erro: `sip.send is not a function`

## Solução em 3 Passos

### 1️⃣ Limpar Banco de Dados do EasyPanel

**Opção A - Via Console Web (Recomendado):**
1. Abra o console do container no painel EasyPanel
2. Execute:
```bash
node fix-easypanel-sqlite.js
```

**Opção B - Via SSH no VPS:**
```bash
docker exec projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma node fix-easypanel-sqlite.js
```

### 2️⃣ Fazer Redeploy

**No painel EasyPanel:**
1. Vá em **Projects** → **abmix-telefone**
2. Clique em **"Rebuild"** ou **"Redeploy"**
3. Aguarde o build completar (2-5 minutos)

**OU via Git (se configurado):**
```bash
git push origin main --force
```

### 3️⃣ Verificar Logs

Após o redeploy, execute:
```bash
docker logs -f projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma
```

**Logs esperados (CORRETOS):**
```
[SIP_MODULE] ✅ SIP module loaded successfully
[FALEVONO_PROVIDER] Username: Felipe_Manieri  ← CORRETO
[SIP_SERVICE] ✅ Registration successful      ← DEVE APARECER
```

**Logs errados (NÃO deve aparecer):**
```
❌ Username: Fe120784!
❌ sip.send is not a function
```

---

## Checklist de Validação

- [ ] Banco limpo (só 1 número: Felipe_Manieri)
- [ ] Redeploy concluído com sucesso
- [ ] Logs mostram username correto
- [ ] Registro SIP bem-sucedido
- [ ] Chamadas funcionando

---

## 🆘 Problemas?

Se ainda aparecer `sip.send is not a function`, o build não atualizou. Tente:
1. Deletar o cache do build no EasyPanel
2. Fazer "Full Rebuild"
3. Reiniciar o container manualmente
