# --- BUILD ---
FROM node:20-alpine AS build
WORKDIR /app
# FORCE REBUILD - NO TWILIO - ONLY RTP/SIP - FIX AUDIO BILATERAL v3
ENV REBUILD_TIMESTAMP="2025-11-12-02:15:00"
ENV FORCE_REBUILD="true"
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- RUNTIME ---
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 5000
EXPOSE 10000/udp
EXPOSE 6060/udp

# Healthcheck with more lenient settings
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["npm","start"]
