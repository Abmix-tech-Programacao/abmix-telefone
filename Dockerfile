
# --- BUILD (com ferramentas nativas) ---
FROM node:20-alpine AS build
WORKDIR /app

# Instalar ferramentas de build nativas necessárias
RUN apk add --no-cache python3 make g++ git curl

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies)
RUN npm install

# Copiar código fonte
COPY . .

# Build da aplicação (frontend + backend)
RUN npm run build

# --- RUNTIME (leve) ---
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm install --omit=dev

# Copiar artefatos de build do estágio anterior
COPY --from=build /app/dist ./dist

# Copiar diretórios necessários em runtime
COPY --from=build /app/data ./data
COPY --from=build /app/shared ./shared

# Expor portas
EXPOSE 5000
EXPOSE 5060/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health',r=>process.exit(r.statusCode===200?0:1))"

# Comando de inicialização
CMD ["npm", "start"]
