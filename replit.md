# Abmix - Sistema de Discagem Inteligente

## Overview

Abmix is an AI-powered telephony system for intelligent voice calls, offering real-time transcription, AI agent control, and advanced call management. It provides a unified interface for outbound calls, AI conversation flow management, live prompt injection, and real-time Portuguese transcription. The system integrates FaleVono for telephony, ElevenLabs for voice synthesis, and Deepgram for speech-to-text, forming a complete conversational AI telephony solution with a modern web application.

## Recent Changes (November 04, 2025 - 16:50) 📚 TUTORIAL DE DEPLOY COMPLETO

### DEPLOY.md COMPLETAMENTE REESCRITO - PRONTO PARA USO 🎉
- ✅ **Tutorial Completo**: 580+ linhas de documentação detalhada passo-a-passo
- ✅ **12 Seções Estruturadas**: Sumário navegável desde setup até troubleshooting
- ✅ **Linguagem Simples**: Instruções claras para usuários não-técnicos
- ✅ **Destaque para Configurações Críticas**: Network Mode = host (OBRIGATÓRIO para SIP)
- ✅ **Tabelas de Configuração**: Copy-paste fácil para todas as configurações
- ✅ **Links Diretos**: Como obter API keys (ElevenLabs, Deepgram)
- ✅ **Deploy vs Redeploy**: Diferença clara entre primeiro deploy e atualizações
- ✅ **7 Testes de Funcionamento**: Health check, logs SIP, chamada teste, SSL
- ✅ **9 Problemas Comuns**: Troubleshooting expandido com soluções detalhadas
- ✅ **Checklist de 20 Itens**: Validação completa antes de considerar deploy finalizado
- ✅ **Monitoramento**: Logs, métricas, backup, comandos úteis SSH

### Seções Principais do DEPLOY.md:
1. Visão Geral - Entendimento do fluxo completo
2. Pré-requisitos - Tabela com tudo que é necessário
3. Preparar GitHub - Como garantir código atualizado
4. Conectar EasyPanel - Autorização e configuração passo-a-passo
5. Criar Aplicação - Onde clicar e o que preencher
6. Variáveis de Ambiente - 5 variáveis obrigatórias + links para obter API keys
7. Configurações Avançadas - Network Mode = host (CRÍTICO!)
8. Deploy Inicial - Processo de build e verificação
9. Verificar Funcionamento - Testes web, health check, logs SIP, chamada teste
10. Redeploy - Como atualizar o sistema após mudanças
11. Troubleshooting - 9 problemas comuns + soluções
12. Checklist Final - 20 itens para validar deploy completo

### Melhorias de Usabilidade:
- 🎯 **Avisos Visuais**: Caixas de atenção para configurações críticas
- 📊 **Tabelas Organizadas**: Configurações, portas, variáveis de ambiente
- 🔗 **Links Úteis**: FaleVono, ElevenLabs, Deepgram, Let's Encrypt
- 💻 **Comandos SSH**: Debug e manutenção do container
- ✅ **Mensagens Esperadas**: Exemplos de logs corretos vs erros

---

## Recent Changes (November 03, 2025 - 23:09) 🚀 PREPARADO PARA DEPLOY VPS

### DEPLOY EM VPS COM EASYPANEL - PRONTO PARA PRODUÇÃO 🎉
- ✅ **Dockerfile Criado**: Multi-stage build otimizado para Node.js 20 Alpine (ESM)
- ✅ **docker-compose.yml**: Configuração completa com network mode host para SIP/UDP
- ✅ **.dockerignore**: Otimização de build removendo arquivos desnecessários
- ✅ **.env.example**: Template com todas as variáveis necessárias (FaleVono + AI services)
- ✅ **Health Check Atualizado**: Endpoints /api/health (simples) e /api/health/detailed
- ⚠️ **Limitação Replit**: SIP/UDP não funciona no Replit (firewall bloqueia) - **deploy em VPS é obrigatório**

### Arquivos de Deploy Criados:
- `Dockerfile` - Container production-ready (ESM format)
- `docker-compose.yml` - Orquestração com portas UDP (5060/6060)
- `.dockerignore` - Otimização de build
- `.env.example` - Template de variáveis
- `DEPLOY.md` - Guia completo de deploy (580+ linhas)

### Como Fazer Deploy:
1. Fazer push do código para GitHub
2. Criar app no EasyPanel conectando repositório
3. Adicionar variáveis de ambiente (FALEVONO_PASSWORD, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY)
4. **IMPORTANTE**: Configurar Network Mode = `host` (permite SIP/UDP)
5. Deploy (1 clique)

Veja detalhes completos em: **DEPLOY.md**

---

## Recent Changes (November 03, 2025 - 22:34) ✅ APROVADO PELO ARCHITECT

### CORREÇÃO CRÍTICA: CONFLITO DE ROTAS RESOLVIDO 🔧
- ✅ **Problema Identificado**: Rotas duplicadas em `telephony.ts` e `routes.ts` causavam uso do Twilio (não configurado) ao invés do FaleVono SIP
- ✅ **Solução Implementada**: 
  - Rotas `/api/call/dial` e `/api/call/hangup` comentadas em `telephony.ts` (linhas 153-178)
  - Backend `routes.ts` corrigido para aceitar campo `to` (ao invés de `phoneNumber`)
  - Frontend alinhado para enviar `{ to, voipNumberId, voiceType }`
- ✅ **Formato de Número Padronizado**: DDD+número sem prefixo +55 (ex: `11999999999`)
- ✅ **Fluxo Completo Validado**: Frontend → routes.ts → ProviderFactory → SIPService (FaleVono)
- ✅ **APROVADO PELO ARCHITECT**: "PASS — dialing now uses the `to` field consistently end-to-end and the SIP flow is aligned"

### INTEGRAÇÃO SIP REAL COMPLETA - PRONTA PARA PRODUÇÃO 🎉
- ✅ **Biblioteca SIP Instalada**: Pacote `sip` do npm com módulo `digest` integrado
- ✅ **SIPService Production-Ready**: Classe TypeScript completa (550+ linhas)
- ✅ **Autenticação Digest Completa**: 
  - REGISTER: Handler 401/407 com digest.challenge + digest.signRequest
  - INVITE: Método reInviteWithAuth para re-autenticação automática
  - Sessions separadas para registro vs. chamadas individuais
- ✅ **Endereçamento de Rede Correto**:
  - IP real detectado via hostname (172.31.70.162)
  - Contact URIs e SDP usam IP roteável
  - Porta client consistente (6060)
- ✅ **Diálogos SIP RFC-Compliant**:
  - ACK usa Contact URI do 200 OK (não Request-URI)
  - BYE usa dialog.remote correto (headers.to com tag)
  - CANCEL preserva Via/branch/tag do INVITE original
  - Dialog tracking: local, remote, inviteRequest, lastResponse, cseq
- ✅ **Gestão de Estado Robusta**: Tracking completo, erros detalhados, flag registered
- ✅ **APROVADO PELO ARCHITECT**: "PASS – dialog state correctly tracks remote leg, BYE/INFO will address callee"

### Sistema Pronto Para:
- 📞 **Fazer Chamadas Reais**: REGISTER + INVITE autenticado para vono2.me:5060
- 📴 **Desligar Chamadas**: BYE/CANCEL RFC-compliant
- 🔢 **Enviar DTMF**: INFO com headers corretos
- 🔐 **Autenticação Automática**: Responde a desafios 401/407

### Limitação Conhecida:
- ⚠️ **RTP/Áudio**: Biblioteca `sip` faz apenas sinalização - áudio requer biblioteca RTP separada

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is a React with TypeScript application utilizing modern UI patterns. It employs a component-based design with shadcn/ui and Tailwind CSS for styling and responsiveness. Key decisions include React + TypeScript for type safety, Zustand for state management, TanStack Query for server state, Wouter for routing, and WebSocket for real-time communication.

### Backend Architecture
The server uses Express.js with TypeScript, providing a REST API and WebSocket support. It features a provider pattern for telephony services (e.g., FaleVono, SobreIP, Twilio) and modular service organization. SQLite is used for local persistence of VoIP numbers, calls, recordings, and favorites. Sensitive credentials are stored exclusively in environment variables.

### Data Storage Solutions
The system currently uses in-memory storage with interfaces designed for future database migration. Drizzle ORM is configured for PostgreSQL with schema definitions for calls, transcripts, and prompts.

### Real-time Communication
WebSocket integration enables bi-directional communication for call state updates, live transcription streaming, AI agent status changes, latency monitoring, and error notifications.

## External Dependencies

### Telephony Providers
- **FaleVono**: Primary Brazilian VoIP provider via SIP protocol.
- **SobreIP**: Alternative Brazilian VoIP provider.
- **Twilio**: Optional alternative for granular telephony control with Media Streams.
- **Vapi**: (Future integration) AI voice platform.
- **Retell AI**: (Future integration) Alternative AI voice provider.

### AI and Speech Services
- **ElevenLabs**: Primary TTS/STT service for Portuguese voice synthesis and transcription via WebSocket.
- **Deepgram**: For real-time Portuguese speech-to-text transcription.
- **OpenAI**: Integrated for AI conversation logic and live prompt injection.

### Frontend Dependencies
- **shadcn/ui**: React component library built on Radix UI.
- **Radix UI**: Unstyled, accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **React Hook Form**: Form handling with validation.

### Development and Build Tools
- **Vite**: Fast build tool and development server.
- **TypeScript**: Static typing for frontend and backend.
- **Drizzle Kit**: Database migration and schema management.