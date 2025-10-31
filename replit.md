# Abmix - Sistema de Discagem Inteligente

## Overview

Abmix is a comprehensive AI-powered telephony system designed for managing intelligent voice calls with real-time transcription, AI agent control, and advanced call management features. The system provides a unified interface for handling outbound calls, managing AI conversation flow, live prompt injection, and real-time Portuguese transcription. Built as a modern web application, it integrates Twilio for telephony services, Respeecher for voice modification, and Deepgram for speech-to-text transcription to create a complete conversational AI telephony solution.

## Recent Changes (August 15, 2025)

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
- **Provider Pattern**: Abstracted telephony providers (Vapi, Retell, Twilio) behind common interface for easy switching
- **WebSocket Server**: Real-time communication layer for call state updates and live transcription
- **Memory Storage**: In-memory data storage for development, with interfaces designed for future database integration
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
- **Vapi**: Primary AI voice platform for managed voice conversations with built-in AI capabilities
- **Retell AI**: Alternative AI voice provider with similar managed conversation features
- **Twilio**: Granular telephony control with Media Streams for custom AI integration
- **Neon Database**: PostgreSQL hosting service for production data storage

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