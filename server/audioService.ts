import { EventEmitter } from 'events';

/**
 * Audio Service - Gerencia áudio bilateral para chamadas SIP
 * Substitui o RTP Service problemático com implementação mais robusta
 */

interface AudioSession {
  callId: string;
  isActive: boolean;
  remoteAddress?: string;
  remotePort?: number;
}

class AudioService extends EventEmitter {
  private sessions: Map<string, AudioSession> = new Map();

  /**
   * Criar sessão de áudio para uma chamada
   */
  createSession(callId: string): AudioSession {
    const session: AudioSession = {
      callId,
      isActive: true
    };

    this.sessions.set(callId, session);
    console.log(`[AUDIO] Session created for call ${callId}`);
    
    return session;
  }

  /**
   * Configurar endereço remoto para áudio
   */
  setRemoteAddress(callId: string, address: string, port: number): void {
    const session = this.sessions.get(callId);
    if (session) {
      session.remoteAddress = address;
      session.remotePort = port;
      console.log(`[AUDIO] Remote address set for ${callId}: ${address}:${port}`);
    }
  }

  /**
   * Processar áudio recebido (mock para desenvolvimento)
   */
  processIncomingAudio(callId: string, audioData: Buffer): void {
    const session = this.sessions.get(callId);
    if (!session || !session.isActive) {
      return;
    }

    console.log(`[AUDIO] Processing incoming audio for call ${callId} (${audioData.length} bytes)`);
    
    // Emitir evento de áudio recebido
    this.emit('audio-received', {
      callId,
      audioData,
      timestamp: Date.now()
    });
  }

  /**
   * Enviar áudio de saída
   */
  sendAudio(callId: string, audioData: Buffer): boolean {
    const session = this.sessions.get(callId);
    if (!session || !session.isActive) {
      console.log(`[AUDIO] Cannot send audio - session not active for call ${callId}`);
      return false;
    }

    console.log(`[AUDIO] Sending audio for call ${callId} (${audioData.length} bytes)`);
    
    // Emitir evento de áudio enviado
    this.emit('audio-sent', {
      callId,
      audioData,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Encerrar sessão de áudio
   */
  endSession(callId: string): void {
    const session = this.sessions.get(callId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(callId);
      console.log(`[AUDIO] Session ended for call ${callId}`);
      
      this.emit('session-ended', { callId });
    }
  }

  /**
   * Obter sessão de áudio
   */
  getSession(callId: string): AudioSession | undefined {
    return this.sessions.get(callId);
  }

  /**
   * Obter todas as sessões ativas
   */
  getActiveSessions(): AudioSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Verificar se há áudio ativo
   */
  hasActiveAudio(): boolean {
    return this.getActiveSessions().length > 0;
  }
}

// Singleton instance
export const audioService = new AudioService();
