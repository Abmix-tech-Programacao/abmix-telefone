# Abmix - Sistema de Discagem Inteligente

## Overview
Abmix is an AI-powered telephony system for intelligent voice calls, offering real-time transcription, AI agent control, and advanced call management. It provides a unified interface for outbound calls, AI conversation flow management, live prompt injection, and real-time Portuguese transcription. The system integrates FaleVono as the sole telephony provider via SIP protocol, ElevenLabs for voice synthesis, and Deepgram for speech-to-text, forming a complete conversational AI telephony solution with a modern web application.

The project's ambition is to provide a robust, production-ready solution for intelligent voice interactions, with a focus on seamless deployment and maintainability on platforms like EasyPanel.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The client-side is a React with TypeScript application utilizing modern UI patterns. It employs a component-based design with `shadcn/ui` and `Tailwind CSS` for styling and responsiveness. Dark mode consistency is prioritized.

### Technical Implementations
The system is built as an ESM (ECMAScript Modules) project.
- **Frontend**: React with TypeScript, Zustand for state management, TanStack Query for server state, Wouter for routing, and WebSocket for real-time communication. AudioMonitor component provides real-time microphone and speaker level visualization.
- **Backend**: Express.js with TypeScript, providing a REST API and WebSocket support. It features a provider pattern for telephony services and modular service organization.
- **Telephony Integration**: Full SIP protocol implementation for FaleVono with CommonJS module loading (createRequire), including Digest authentication, RFC-compliant dialogs (REGISTER, INVITE, ACK, BYE, CANCEL), and proper network addressing. The system uses port 5000 for web interface, port 6060 for SIP client (configurable via FALEVONO_SIP_PORT), and **port 10000 for RTP media server**. **IMPORTANT**: SIP requires UDP communication which is **blocked in Replit development environment** - production deployment (EasyPanel/VPS) is required for full functionality. TCP fallback available via `SIP_USE_TCP=true`.
- **RTP Media Server**: Implemented using rtp.js library to handle real-time audio streaming. Supports G.711 μ-law (PCMU) and A-law (PCMA) codecs with 8kHz sampling rate. Automatically creates RTP sessions when SIP calls connect, processes incoming audio for voice conversion, and sends converted audio back to caller. Port 10000 must be open for UDP traffic in production.
- **DTMF Sound System**: Complete DTMF tone generation using Web Audio API with accurate dual-tone frequencies (ITU-T standard). Features include real-time keypad sounds, toggle on/off control, localStorage persistence, and ADSR envelope for smooth audio without clicks. Integrated seamlessly into the dialer interface with visual feedback.
- **Voice AI Pipeline**: Complete autonomous conversational AI flow: RTP incoming audio → G.711 decode → PCM16 → ElevenLabs STT (Portuguese) → Text transcription → **OpenAI Conversational AI** → AI Response → ElevenLabs TTS (voice conversion) → PCM16 audio → G.711 encode → RTP outgoing audio. Voice type (masculine/feminine/natural/original) fully configurable per call via UI and favorites. When "Original" (none) is selected, audio passes through without voice conversion. **AI agent auto-starts when call begins and auto-ends when call terminates**, maintaining conversation context throughout the call lifecycle.
- **OpenAI Integration**: Fully functional conversational AI using OpenAI Chat Completion API with streaming responses. AgentOrchestrator manages per-call conversation state, system prompts, message history, and AI responses. Supports live prompt injection during calls, agent enable/disable, and speech pause/resume controls. All AI interactions are persisted in agent_sessions and agent_messages tables.
- **Data Storage**: SQLite for local persistence of VoIP numbers, calls, recordings, favorites, agent sessions, and AI messages. Drizzle ORM is configured for PostgreSQL with schema definitions for calls, transcripts, prompts, agent_sessions, agent_messages, effect_presets, and codec_preferences. Sensitive credentials are stored exclusively in environment variables.
- **Real-time Communication**: WebSocket integration enables bi-directional communication for call state updates, live transcription streaming, AI agent status changes, latency monitoring, and error notifications.

### Feature Specifications
- **Intelligent Voice Calls**: AI-powered conversational flows.
- **Real-time Transcription**: Live Portuguese transcription during calls.
- **AI Agent Control**: Management of AI conversation agents.
- **Live Prompt Injection**: Dynamic modification of AI prompts during calls.
- **Call Management**: Unified interface for outbound calls and call control.
- **VoicesHub**: Centralized voice management interface consolidating all voice-related features:
  - Voice Configuration: Configure masculine, feminine, and natural voice IDs
  - Voice Library: Browse and test all available ElevenLabs voices
  - Voice Testing: Real-time text-to-speech preview with custom text
  - Voice Cloning: Convert audio files to different voices using ElevenLabs Speech-to-Speech API
  - Audio Effects: Apply effects like noise reduction, equalization, amplification, and normalization
  - Advanced Settings: Adjust stability, similarity, style, speaker boost, and AI model selection

### System Design Choices
The architecture emphasizes modularity, scalability, and ease of deployment. Key decisions include:
- Exclusive use of FaleVono as the telephony provider for streamlined integration.
- ESM for modern JavaScript development and compatibility with Vite.
- CommonJS module loading for SIP library via createRequire (fixes "sip.send is not a function").
- Singleton pattern for SIPService and RTserviceService to prevent multiple stack instances.
- RTP server implementation with G.711 codec support for VoIP audio (PCMU/PCMA).
- Event-driven architecture for audio pipeline: RTP events → STT processing → **OpenAI conversational AI** → TTS conversion → RTP output.
- **OpenAI Chat API** with streaming for natural conversation flow and reduced latency.
- **AgentOrchestrator pattern** for managing AI conversation state, history, and lifecycle per call.
- **Automatic agent lifecycle management**: AI agent auto-starts on call initiation and auto-ends on hangup.
- Service layer separation: OpenAIService (API communication), AgentOrchestrator (business logic), Storage (persistence).
- Containerization with Docker for consistent deployment across environments.
- Comprehensive `DEPLOY.md` documentation for simplified setup and troubleshooting.
- Robust error handling and state management for SIP dialogues, RTP sessions, and AI conversations.

### Known Limitations
- **Replit Development Environment**: UDP ports are blocked, preventing SIP registration and RTP media transmission in development mode. The system will show timeout errors when attempting calls, and audio will not be transmitted. **Solution**: Deploy to production (EasyPanel, VPS, or local Docker) where UDP traffic is allowed on ports 6060 (SIP) and 8000 (RTP).
- **Audio Quality**: Currently limited to G.711 codec (8kHz, narrowband). Future enhancement: add wideband codecs like Opus for better audio quality.
- **Audio Effects**: Effects processing is currently a placeholder implementation. Production deployment requires integration with ffmpeg or similar audio processing library for real-time effects (noise reduction, EQ, gain, normalization).

### Recent Critical Fixes (November 2025)
- **SDP IP Configuration (CRITICAL)**: Fixed hardcoded private IP (172.31.70.162) in SIP Service. Now **requires** `PUBLIC_IP` environment variable with strict validation (rejects private/loopback ranges, validates IPv4 format). System will abort initialization with clear error if PUBLIC_IP is missing or invalid. This ensures FaleVono can send RTP audio back to the server correctly.
- **Environment Variable**: Added **mandatory** `PUBLIC_IP` variable to deployment configuration with comprehensive validation for proper RTP media routing in production. No fallbacks - prevents accidental use of private IPs.

## External Dependencies

### Telephony Providers
- **FaleVono**: Primary Brazilian VoIP provider via SIP protocol.

### AI and Speech Services
- **ElevenLabs**: Speech-to-text (STT) and text-to-speech (TTS) for Brazilian Portuguese. Provides real-time transcription and voice synthesis with support for multiple voice types (masculine, feminine, natural).
- **OpenAI**: Conversational AI using Chat Completion API with streaming. **Fully integrated** with OpenAIService for API communication, AgentOrchestrator for conversation management, and complete support for live prompt injection, agent control (enable/disable), and speech control (pause/resume). Auto-starts on call initiation with default Portuguese system prompt.

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
- **rtp.js**: RTP/RTCP packet parsing and generation library for Node.js and browser.