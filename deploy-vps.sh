#!/bin/bash
# Deploy Abmix - Instruções no README
set -e

echo "🚀 Instalando Abmix..."

# Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# PM2
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Repositório
echo "📥 Qual o repositório?"
read -p "URL: " REPO_URL

cd /root
rm -rf abmix 2>/dev/null || true
git clone "$REPO_URL" abmix
cd abmix

# .env - CONFIGURE COM SUAS CREDENCIAIS
echo "🔧 IMPORTANTE: Configure o arquivo .env com suas credenciais"
echo "Exemplo em .env.example"

if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "Crie o arquivo .env com suas credenciais antes de continuar"
    exit 1
fi

chmod 600 .env

# Build
echo "🔨 Instalando e compilando..."
npm install
npm run build

# Firewall
echo "🔥 Configurando firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 5060/udp
sudo ufw allow 8000/udp
sudo ufw reload

# PM2
echo "🚀 Iniciando..."
pm2 stop abmix 2>/dev/null || true
pm2 delete abmix 2>/dev/null || true
pm2 start npm --name "abmix" -- start
pm2 save
pm2 startup systemd -u root --hp /root

PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "✅ PRONTO!"
echo "Acesse: http://$PUBLIC_IP:5000"
echo ""
echo "Comandos:"
echo "  pm2 logs abmix"
echo "  pm2 restart abmix"
