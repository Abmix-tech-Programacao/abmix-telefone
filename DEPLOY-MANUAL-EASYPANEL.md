# 🚀 Deploy Manual do Código Corrigido no EasyPanel

## Problema
O EasyPanel está rodando código antigo. Git push não está sincronizando automaticamente.

## Solução Rápida: Copiar Arquivo Corrigido Diretamente

### Passo 1: Baixar arquivo corrigido do Replit

No shell do Replit, execute:
```bash
cat server/sipService.ts > /tmp/sipService.ts
```

Depois baixe o arquivo `/tmp/sipService.ts` do Replit para seu computador.

### Passo 2: Copiar para o VPS via SCP

No PowerShell do seu PC:
```powershell
scp C:\Users\felip\Downloads\sipService.ts root@72.60.149.107:/tmp/
```

### Passo 3: Copiar para dentro do container

No SSH do VPS:
```bash
# Copiar arquivo para dentro do container
docker cp /tmp/sipService.ts projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma:/app/server/

# Rebuild do TypeScript
docker exec projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma npm run build

# Reiniciar aplicação
docker restart projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma
```

### Passo 4: Verificar logs

```bash
docker logs -f projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma | grep -E "SIP|Username"
```

**Deve aparecer:**
```
[SIP_MODULE] ✅ SIP module loaded successfully
[FALEVONO_PROVIDER] Username: Felipe_Manieri
```

**NÃO deve aparecer:**
```
❌ sip.send is not a function
```

---

## Alternativa: Rebuild Completo via GitHub

### 1. Configure webhook GitHub → EasyPanel

No painel EasyPanel:
1. **Settings** → **Git**
2. **Connect to GitHub**
3. **Repository:** `Abmix-tech-Programacao/abmix-telefone`
4. **Branch:** `main`
5. **Auto Deploy:** Ativado

### 2. Fazer push do Replit

No Replit, execute:
```bash
git add .
git commit -m "Fix SIP module loading issue"
git push origin main --force
```

### 3. Aguardar auto-deploy

O EasyPanel vai detectar o push e fazer rebuild automaticamente.

---

## ✅ Validação Final

Após qualquer método, teste uma chamada e verifique nos logs:

```bash
docker logs projeto-abmix-tech_abmix-telefone.1.oy173vonhph0hvvgp5l73nzma --tail 100 | grep "Registration"
```

**Sucesso:** `✅ Registration successful`  
**Falha:** `❌ Registration failed`
