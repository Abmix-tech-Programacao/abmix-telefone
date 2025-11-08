# ⚡ SOLUÇÃO SIMPLES - Forçar Build Limpo SEM Recriar App

## 🎯 **PROBLEMA:**
EasyPanel está usando cache antigo com `rtp.js`

## 🔧 **SOLUÇÃO FÁCIL - 2 MINUTOS:**

### **OPÇÃO 1: Build Args (Mais Simples)**
**No EasyPanel:**
1. Vá em **Advanced Settings** ou **Build Settings**
2. Procure por **Build Args** ou **Docker Build Arguments**
3. Adicione:
   ```
   --no-cache
   ```
4. **Save** + **Redeploy**

### **OPÇÃO 2: Dockerfile Hack (Garantido)**
Vou modificar o Dockerfile para **forçar** limpeza do cache:

**Adicionar uma linha que muda sempre** → força rebuild completo
