// Load environment variables
import { config } from "dotenv";
config();

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { queries } from './database';
import { agentOrchestrator } from './agentOrchestrator';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface RealtimeVoiceSession {
  callSid: string;
  voiceType: 'masc' | 'fem' | 'natural';
  sttWs: WebSocket | null;  // Speech-to-Text WebSocket
  ttsWs: WebSocket | null;  // Text-to-Speech WebSocket
  isConnected: boolean;
  enabled: boolean;
  lastActivity: number;
}

class RealtimeVoiceService extends EventEmitter {
  private sessions = new Map<string, RealtimeVoiceSession>();
  private latencyMetrics: number[] = [];

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  // Get voice configuration
  private getVoiceConfig(voiceType: 'masc' | 'fem' | 'natural') {
    const voiceIdKey = voiceType === 'masc' ? 'VOZ_MASC_ID' : 
                        voiceType === 'fem' ? 'VOZ_FEM_ID' : 'VOZ_NATURAL_ID';
    const voiceIdResult = queries.getSetting.get(voiceIdKey) as { value: string } | undefined;
    
    const defaultVoices = {
      masc: 'pNInz6obpgDQGcFmaJgB',  // Adam - voz masculina natural
      fem: 'EXAVITQu4vr4xnSDxMaL',    // Bella - voz feminina natural
      natural: 'onwK4e9ZLuTAKqWW03F9' // Daniel - voz neutra natural
    };
    
    return voiceIdResult?.value || defaultVoices[voiceType];
  }

  // Generate ElevenLabs WebSocket token
  private async generateElevenLabsToken(): Promise<string | null> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/token', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[REALTIME_VOICE] Failed to generate token: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.token;
    } catch (error) {
      console.error('[REALTIME_VOICE] Error generating ElevenLabs token:', error);
      return null;
    }
  }

  // Start real-time voice conversion session
  async startRealtimeVoice(callSid: string, voiceType: 'masc' | 'fem' | 'natural'): Promise<boolean> {
    try {
      const targetVoiceId = this.getVoiceConfig(voiceType);
      
      console.log(`[REALTIME_VOICE] Starting TTS-only session ${callSid} with voice ${targetVoiceId}`);
      console.log(`[REALTIME_VOICE] ⚠️  STT desabilitado (ElevenLabs retorna 403) - apenas TTS`);

      // CORREÇÃO: STT retorna 403 com xi-api-key
      // Usar apenas TTS (Text-to-Speech) para conversão
      // O áudio de entrada vai direto sem conversão
      
      const sttWs = null; // STT desabilitado

      // Start TTS session for outgoing audio
      const ttsWs = new WebSocket(`wss://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}/stream-input?model_id=eleven_multilingual_v2`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      const session: RealtimeVoiceSession = {
        callSid,
        voiceType,
        sttWs,
        ttsWs,
        isConnected: false,
        enabled: true,
        lastActivity: Date.now()
      };

      // STT desabilitado (403 error)
      // Áudio de entrada vai direto sem conversão
      
      // Setup STT WebSocket (Speech-to-Text) - DESABILITADO
      if (sttWs) {
        sttWs.on('open', () => {
          console.log(`[REALTIME_VOICE] STT connected for ${callSid}`);
          
          // Configure STT for Portuguese
          sttWs.send(JSON.stringify({
            language: 'pt',
            model: 'whisper-large-v3',
            optimize_streaming_latency: 1
          }));
        });

        sttWs.on('message', async (data) => {
          try {
            const result = JSON.parse(data.toString());
            
            if (result.text && result.is_final && session.enabled) {
              console.log(`[REALTIME_VOICE] STT Result: "${result.text}"`);
              
              // Check if AI agent is active for this call
              const isAgentActive = agentOrchestrator.isAgentActive(callSid);
              
              if (isAgentActive) {
                // Send to OpenAI for AI response
                console.log(`[REALTIME_VOICE] Sending to AI agent: "${result.text}"`);
                const aiResponse = await agentOrchestrator.processUserInput(callSid, result.text);
                
                if (aiResponse) {
                  console.log(`[REALTIME_VOICE] AI Response: "${aiResponse}"`);
                  // Convert AI response to target voice and send to caller
                  this.convertTextToTargetVoice(callSid, aiResponse);
                }
              } else {
                // No AI agent, just do voice conversion
                this.convertTextToTargetVoice(callSid, result.text);
              }
            }
          } catch (error) {
            console.error('[REALTIME_VOICE] STT parse error:', error);
          }
        });
      }

      // Setup TTS WebSocket (Text-to-Speech)
      ttsWs.on('open', () => {
        console.log(`[REALTIME_VOICE] TTS connected for ${callSid}`);
        
        // Configure TTS for optimal real-time performance
        ttsWs.send(JSON.stringify({
          text: " ",
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.85,
            style: 0.15,
            use_speaker_boost: true
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          },
          optimize_streaming_latency: 1,
          output_format: "pcm_8000" // Compatible with RTP
        }));

        session.isConnected = true;
        this.emit('realtime-voice-ready', callSid);
      });

      ttsWs.on('message', (data) => {
        session.lastActivity = Date.now();
        
        try {
          const message = JSON.parse(data.toString());
          
          if (message.audio) {
            // Emit converted audio for RTP
            this.emit('converted-voice-audio', callSid, Buffer.from(message.audio, 'base64'));
          }
        } catch (error) {
          console.error('[REALTIME_VOICE] TTS parse error:', error);
        }
      });

      // Error handling
      if (sttWs) {
        sttWs.on('error', (error) => {
          console.error(`[REALTIME_VOICE] STT error for ${callSid}:`, error);
        });
      }

      ttsWs.on('error', (error) => {
        console.error(`[REALTIME_VOICE] TTS error for ${callSid}:`, error);
      });

      // Cleanup on close
      const cleanup = () => {
        console.log(`[REALTIME_VOICE] Session ${callSid} closed`);
        session.isConnected = false;
        this.sessions.delete(callSid);
        this.emit('realtime-voice-closed', callSid);
      };

      if (sttWs) sttWs.on('close', cleanup);
      ttsWs.on('close', cleanup);

      this.sessions.set(callSid, session);
      return true;

    } catch (error) {
      console.error(`[REALTIME_VOICE] Failed to start session:`, error);
      return false;
    }
  }

  // Process incoming audio for STT
  processIncomingAudio(callSid: string, audioBase64: string): boolean {
    const session = this.sessions.get(callSid);
    
    // STT desabilitado - retornar true para não gerar erro
    if (!session || !session.enabled) {
      return false;
    }
    
    // Se não tem STT (null), ignorar
    if (!session.sttWs) {
      return true; // Retornar true para não logar erro
    }

    try {
      // Verificar se WebSocket está aberto antes de enviar
      if (session.sttWs.readyState !== WebSocket.OPEN) {
        return false; // Não logar erro se estiver conectando
      }
      
      // Send audio to STT
      session.sttWs.send(JSON.stringify({
        audio: audioBase64
      }));

      session.lastActivity = Date.now();
      return true;

    } catch (error) {
      console.error(`[REALTIME_VOICE] Error processing audio:`, error);
      return false;
    }
  }

  // Convert text to target voice
  private convertTextToTargetVoice(callSid: string, text: string): boolean {
    const session = this.sessions.get(callSid);
    
    if (!session || !session.ttsWs || !session.enabled) {
      return false;
    }

    try {
      // Send text to TTS for voice conversion
      session.ttsWs.send(JSON.stringify({
        text: text,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true
        }
      }));

      return true;

    } catch (error) {
      console.error(`[REALTIME_VOICE] Error converting text:`, error);
      return false;
    }
  }

  // Enable/disable voice conversion
  setConversionEnabled(callSid: string, enabled: boolean): boolean {
    const session = this.sessions.get(callSid);
    
    if (!session) {
      console.warn(`[REALTIME_VOICE] Session ${callSid} not found`);
      return false;
    }

    session.enabled = enabled;
    console.log(`[REALTIME_VOICE] Session ${callSid} conversion ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  // Check if conversion is enabled
  isConversionEnabled(callSid: string): boolean {
    const session = this.sessions.get(callSid);
    return session ? session.enabled : false;
  }

  // Stop session
  stopRealtimeVoice(callSid: string): boolean {
    const session = this.sessions.get(callSid);
    
    if (session) {
      console.log(`[REALTIME_VOICE] Stopping session ${callSid}`);
      
      if (session.sttWs) session.sttWs.close();
      if (session.ttsWs) session.ttsWs.close();
      
      this.sessions.delete(callSid);
      return true;
    }
    return false;
  }

  // Get session statistics
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      averageLatency: this.getAverageLatency(),
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        voiceType: session.voiceType,
        isConnected: session.isConnected,
        enabled: session.enabled,
        lastActivity: session.lastActivity
      }))
    };
  }

  // Record latency metrics
  private recordLatency(latency: number): void {
    this.latencyMetrics.push(latency);
    
    if (this.latencyMetrics.length > 10) {
      this.latencyMetrics.shift();
    }
  }

  // Get average latency
  private getAverageLatency(): number {
    if (this.latencyMetrics.length === 0) return 0;
    
    const sum = this.latencyMetrics.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyMetrics.length);
  }

  // Cleanup inactive sessions
  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 300000; // 5 minutes
      
      for (const [callSid, session] of Array.from(this.sessions.entries())) {
        if (now - session.lastActivity > timeout) {
          console.log(`[REALTIME_VOICE] Cleaning up inactive session: ${callSid}`);
          this.stopRealtimeVoice(callSid);
        }
      }
    }, 60000); // Check every minute
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();







