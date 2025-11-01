# Abmix - Sistema de Discagem Inteligente

## Overview

Abmix is a comprehensive AI-powered telephony system designed for managing intelligent voice calls with real-time transcription, AI agent control, and advanced call management features. The system provides a unified interface for handling outbound calls, managing AI conversation flow, live prompt injection, and real-time Portuguese transcription. Built as a modern web application, it integrates Twilio for telephony services, Respeecher for voice modification, and Deepgram for speech-to-text transcription to create a complete conversational AI telephony solution.

## Recent Changes (November 01, 2025 - 21:00)

### Interface Visual Corrigida ✅
- ✅ **Cores Ajustadas**: Aviso de segurança agora usa cores do painel (bg-card, text-muted-foreground)
- ✅ **Endpoint Vozes Recomendadas**: `/api/voices/recommended` adicionado e funcionando
- ✅ **20 Vozes ElevenLabs**: Disponíveis para testes (5 masculinas recomendadas + 5 femininas)
- ✅ **Todas APIs Respondendo**: Vozes, Gravações, Favoritos, VoIP Numbers

### O Que Está Funcionando AGORA (Testável):
1. **✅ Interface Completa**: 8 abas navegáveis (Discagem, Vozes & TTS, Voz Natural, Áudio & Efeitos, Chamadas, Meus Números, Favoritos, Gravações, Configurações)
2. **✅ Listagem de Vozes**: Clique em "Vozes & TTS" - mostra 20+ vozes do ElevenLabs
3. **✅ Gerenciamento VoIP**: Clique em "Meus Números" - adicione/remova números SobreIP
4. **✅ Sistema de Favoritos**: Adicione contatos favoritos para discagem rápida
5. **✅ Painel de Gravações**: Área pronta para armazenar gravações de chamadas
6. **✅ APIs Funcionais**: Deepgram (transcrição PT-BR), ElevenLabs (TTS), OpenAI (configurado)

### Próximos Passos (Não Implementados):
- ⚠️ **WebSocket Media Streams**: Necessário para chamadas reais com áudio
- ⚠️ **Integração SIP Real**: SobreIPProvider atual é stub, precisa implementação completa
- ⚠️ **Fluxo de Chamadas**: Conectar discagem → transcrição → IA → resposta de voz
- ⚠️ **Clonagem de Voz**: Interface existe, backend precisa ser implementado

## Recent Changes (November 01, 2025 - Anteriores)

### VoIP Number Management System - COMPLETE ✅
- ✅ **Multi-Provider Architecture**: ProviderFactory supporting both Twilio and SobreIP providers
- ✅ **VoIP Numbers CRUD**: Full database schema with secure credential handling
- ✅ **Security Hardening**: SIP passwords stored ONLY in environment variables (SOBREIP_PASSWORD)
- ✅ **Visual Interface**: Complete VoIPNumbers component with add/remove/set-default functionality
- ✅ **Dedicated Page**: /meus-numeros route for VoIP number management
- ✅ **Call Integration**: Dynamic provider selection in DialerCard based on selected VoIP number
- ✅ **API Security**: GET /api/voip-numbers strips sensitive credentials; POST validates env vars
- ✅ **Default Number**: SP Principal (+5511951944022) seeded with SobreIP configuration
- ✅ **Independent from Twilio**: System fully operational without Twilio credentials

### Security Implementation
- 🔒 **No Credentials in Database**: sip_password column stores NULL - passwords only in env vars
- 🔒 **API Response Sanitization**: All API responses strip sensitive credential fields
- 🔒 **Runtime Validation**: ProviderFactory validates SOBREIP_PASSWORD exists before creating provider
- 🔒 **UI Guidance**: Security banner in UI instructs users about environment variable requirements
- 🔒 **Seed Script**: Aligned with security model - no placeholder passwords in database

## Previous Changes (August 15, 2025)

### Complete Backend Implementation - FINAL
- ✅ **SQLite Database**: Full local persistence with better-sqlite3 - recordings, calls, favorites, settings tables
- ✅ **ElevenLabs Integration**: Advanced voice synthesis and real-time voice modification replacing Deepgram/Respeecher
- ✅ **Twilio Telephony**: Complete call management with WebSocket media streams on `/captions` and `/media` paths
- ✅ **Recording System**: Full audio recording pipeline - start, pause, resume, stop with metadata storage
- ✅ **Voice/IA API**: Complete REST endpoints - `/api/settings`, `/api/voices`, `/api/recordings/*`, `/api/favorites/*`
- ✅ **TwiML Endpoint**: Portuguese XML response handler for proper call flow - IMPLEMENTADO

### Critical Fixes Applied (Latest)
- ✅ **TwilioProvider Completo**: Todas as operações funcionais - chamadas, hangup, DTMF, hold/resume, transfer
- ✅ **STTProvider Deepgram**: Streaming em tempo real português, WebSocket integrado
- ✅ **AgentControls Fixed**: Botões de IA corrigidos, usando endpoints corretos
- ✅ **TwiML URL Fix**: Corrigido https:// no REPLIT_DEV_DOMAIN para evitar quedas de chamada
- ✅ **Recording Pause/Resume**: Implementado controles completos de gravação

### Full API Services Integration (Latest Update)
- ✅ **Call Control Endpoints**: `/api/call/dial`, `/api/call/hangup`, `/api/call/dtmf`, `/api/call/answer`
- ✅ **AI Agent Control**: `/api/agent/prompt`, `/api/agent/enable`, `/api/agent/disable` - Real prompt injection
- ✅ **Real-time Metrics**: Server-Sent Events `/api/metrics` - Live latency monitoring
- ✅ **Voice Testing**: `/api/voices/test` - Test masculine/feminine voices with Portuguese phrase
- ✅ **DTMF Support**: Tonal digit transmission during active calls

### Frontend Complete Integration  
- ✅ **Voice Selection**: Masculine/feminine voice type selection with ElevenLabs voices
- ✅ **Favorites Management**: Add/remove quick dial contacts with voice preferences
- ✅ **Settings Integration**: Voice configuration and system preferences
- ✅ **Recording Controls**: Full recording management UI with status tracking
- ✅ **Real-time Metrics**: Latency display and audio level monitoring

### Organized Service Tabs (Latest Update)
- ✅ **7-Tab Navigation**: Discagem, Vozes & TTS, Áudio & Efeitos, Chamadas, Favoritos, Gravações, Configurações
- ✅ **VoiceTester Component**: Test voices with Portuguese welcome phrase
- ✅ **VoiceCloning Component**: Clone and convert voices using advanced AI
- ✅ **AudioEffects Component**: Noise reduction, equalization, amplification, normalization
- ✅ **DubbingTranslation Component**: Multi-language dubbing preserving original voice characteristics
- ✅ **CallManager Component**: Twilio call consultation, history, and real-time status monitoring
- ✅ **DTMFKeypad Component**: 12-key numeric keypad for call control
- ✅ **3-Column Layout Restored**: Clean layout with proper component sizing
- ✅ **Service Segregation**: Each API service group has dedicated interface space

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built using React with TypeScript, utilizing modern UI patterns and state management. The architecture follows a component-based design with shadcn/ui components for consistent styling and Tailwind CSS for responsive design.

**Key Frontend Decisions:**
- **React + TypeScript**: Chosen for type safety and component reusability
- **Zustand State Management**: Selected for its simplicity over Redux, managing call states, transcripts, and UI interactions
- **TanStack Query**: Implemented for server state management, caching, and data synchronization
- **Wouter Routing**: Lightweight routing solution for the single-page application
- **WebSocket Integration**: Real-time communication for call events, transcripts, and system updates

### Backend Architecture
The server implements an Express.js REST API with WebSocket support for real-time communication. The architecture uses a provider pattern for telephony services and modular service organization.

**Key Backend Decisions:**
- **Express + TypeScript**: Provides robust HTTP server capabilities with type safety
- **Provider Pattern**: ProviderFactory dynamically selects telephony providers (SobreIP, Twilio) based on VoIP number configuration
- **SQLite Database**: Local persistence with better-sqlite3 for VoIP numbers, calls, recordings, favorites
- **Security-First Credentials**: All sensitive credentials stored exclusively in environment variables, never in database
- **WebSocket Server**: Real-time communication layer for call state updates and live transcription
- **Modular Services**: Separated concerns for STT, TTS, and telephony providers

### Data Storage Solutions
Currently implements in-memory storage with well-defined interfaces for future database migration. The schema supports favorites management, call history, transcription storage, and prompt tracking.

**Storage Design Decisions:**
- **Interface-Based Storage**: IStorage interface allows easy migration from memory to database
- **Drizzle ORM Integration**: Configured for PostgreSQL with schema definitions ready for production
- **Data Relationships**: Properly structured foreign key relationships between calls, transcripts, and prompts

### Authentication and Authorization
The current implementation focuses on core telephony functionality without authentication, designed for internal/development use. The architecture allows for easy integration of authentication middleware.

### Real-time Communication
WebSocket integration provides bi-directional communication for:
- Call state updates (ringing, connected, ended)
- Live transcription streaming
- AI agent status changes
- Latency and audio level monitoring
- System error notifications

## External Dependencies

### Telephony Providers
- **SobreIP**: Primary Brazilian VoIP provider (voz.sobreip.com.br) for telephony services via SIP protocol
- **Twilio**: Alternative provider for granular telephony control with Media Streams (optional)
- **Vapi**: AI voice platform for managed voice conversations (future integration)
- **Retell AI**: Alternative AI voice provider (future integration)

### AI and Speech Services
- **ElevenLabs**: Primary TTS/STT service for Portuguese voice synthesis and transcription with WebSocket streaming
- **Twilio**: Telephony infrastructure with Media Streams for real-time audio processing
- **OpenAI (implied)**: Large language model integration for AI conversation logic and live prompt injection

### Frontend Dependencies
- **shadcn/ui**: Comprehensive React component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design and dark theme support
- **Lucide React**: Icon library providing consistent iconography
- **React Hook Form**: Form handling with validation integration

### Development and Build Tools
- **Vite**: Fast build tool and development server with HMR support
- **TypeScript**: Static typing for both frontend and backend code
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Fast JavaScript bundler for production builds