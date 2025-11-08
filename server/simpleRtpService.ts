import dgram from 'dgram';
import { EventEmitter } from 'events';

/**
 * Simple RTP Service - Implementação robusta sem bibliotecas problemáticas
 * Substitui rtp.js que está causando erros view.getUint8
 */

interface SimpleRTPSession {
  callId: string;
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  active: boolean;
  ssrc: number;
  sequenceNumber: number;
  timestamp: number;
}

class SimpleRTPService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private sessions: Map<string, SimpleRTPSession> = new Map();
  private port: number = 10000;
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  /**
   * Start Simple RTP server
   */
  async start(port: number = 10000): Promise<void> {
    if (this.isRunning) {
      console.log('[SIMPLE_RTP] Server already running');
      return;
    }

    this.port = port;
    this.socket = dgram.createSocket('udp4');

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create UDP socket'));
        return;
      }

      this.socket.on('error', (err) => {
        console.error('[SIMPLE_RTP] Socket error:', err);
        this.emit('error', err);
      });

      this.socket.on('message', (msg, rinfo) => {
        this.handleIncomingPacket(msg, rinfo);
      });

      this.socket.on('listening', () => {
        const address = this.socket!.address();
        console.log(`[SIMPLE_RTP] Server listening on ${address.address}:${address.port}`);
        this.isRunning = true;
        resolve();
      });

      this.socket.bind(this.port, '0.0.0.0', () => {
        console.log(`[SIMPLE_RTP] Binding to port ${this.port}`);
      });
    });
  }

  /**
   * Stop RTP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.socket) {
      return;
    }

    return new Promise((resolve) => {
      this.socket!.close(() => {
        console.log('[SIMPLE_RTP] Server stopped');
        this.isRunning = false;
        this.socket = null;
        this.sessions.clear();
        resolve();
      });
    });
  }

  /**
   * Create new RTP session
   */
  createSession(
    callId: string,
    remoteAddress: string,
    remotePort: number
  ): SimpleRTPSession {
    const session: SimpleRTPSession = {
      callId,
      remoteAddress,
      remotePort,
      localPort: this.port,
      active: true,
      ssrc: Math.floor(Math.random() * 0xFFFFFFFF),
      sequenceNumber: Math.floor(Math.random() * 0xFFFF),
      timestamp: 0,
    };

    this.sessions.set(callId, session);
    console.log(`[SIMPLE_RTP] Session created for call ${callId} -> ${remoteAddress}:${remotePort}`);
    
    return session;
  }

  /**
   * End RTP session
   */
  endSession(callId: string): void {
    const session = this.sessions.get(callId);
    if (session) {
      session.active = false;
      this.sessions.delete(callId);
      console.log(`[SIMPLE_RTP] Session ended for call ${callId}`);
    }
  }

  /**
   * Handle incoming packets (SIMPLIFIED - sem rtp.js)
   */
  private handleIncomingPacket(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      // Validação básica de RTP packet (12 bytes mínimo)
      if (!msg || msg.length < 12) {
        return; // Silently ignore invalid packets
      }

      // Parse RTP header manualmente (sem rtp.js)
      const version = (msg[0] >> 6) & 0x03;
      const payloadType = msg[1] & 0x7F;
      const sequenceNumber = msg.readUInt16BE(2);
      const timestamp = msg.readUInt32BE(4);
      const ssrc = msg.readUInt32BE(8);

      // Validar versão RTP
      if (version !== 2) {
        return; // Não é RTP válido
      }

      // Encontrar sessão correspondente
      const session = Array.from(this.sessions.values()).find(
        s => s.remoteAddress === rinfo.address && s.remotePort === rinfo.port
      );

      if (!session) {
        // Tentar encontrar qualquer sessão ativa
        const activeSession = Array.from(this.sessions.values()).find(s => s.active);
        if (activeSession) {
          activeSession.remoteAddress = rinfo.address;
          activeSession.remotePort = rinfo.port;
          console.log(`[SIMPLE_RTP] Updated session ${activeSession.callId} with remote ${rinfo.address}:${rinfo.port}`);
          this.processAudioData(activeSession, msg, payloadType);
        }
        return;
      }

      this.processAudioData(session, msg, payloadType);

    } catch (err) {
      // Silently ignore parsing errors to avoid spam
      // console.error('[SIMPLE_RTP] Failed to parse packet:', err);
    }
  }

  /**
   * Process audio data from RTP packet
   */
  private processAudioData(session: SimpleRTPSession, msg: Buffer, payloadType: number): void {
    // Extrair payload (pular header de 12 bytes)
    const payloadStart = 12;
    const payload = msg.subarray(payloadStart);
    
    if (payload.length === 0) {
      return;
    }

    // Processar baseado no payload type
    let audioData: Buffer;
    
    if (payloadType === 0) {
      // PCMU (G.711 μ-law) - converter para PCM16
      audioData = this.decodePCMU(payload);
    } else if (payloadType === 8) {
      // PCMA (G.711 A-law) - converter para PCM16
      audioData = this.decodePCMA(payload);
    } else {
      // Payload type não suportado
      return;
    }

    // Emitir evento de áudio para processamento
    this.emit('audio', {
      callId: session.callId,
      audioData,
      sampleRate: 8000,
      channels: 1,
      format: 'pcm16',
    });
  }

  /**
   * Send audio via RTP (SIMPLIFIED)
   */
  sendAudio(callId: string, audioBuffer: Buffer, sampleRate: number = 8000): boolean {
    const session = this.sessions.get(callId);
    
    if (!session || !session.active || !this.socket) {
      return false;
    }

    try {
      // Converter PCM16 para PCMU (G.711)
      const encodedAudio = this.encodePCMU(audioBuffer);
      
      // Criar header RTP manualmente (12 bytes)
      const header = Buffer.alloc(12);
      header[0] = 0x80; // Version 2, no padding, no extension, no CSRC
      header[1] = 0x00; // Payload type 0 (PCMU)
      header.writeUInt16BE(session.sequenceNumber++, 2); // Sequence number
      header.writeUInt32BE(session.timestamp, 4); // Timestamp
      header.writeUInt32BE(session.ssrc, 8); // SSRC

      // Combinar header + payload
      const packet = Buffer.concat([header, encodedAudio]);

      // Enviar packet
      this.socket.send(packet, session.remotePort, session.remoteAddress, (err) => {
        if (err) {
          console.error('[SIMPLE_RTP] Error sending packet:', err);
        }
      });

      // Atualizar timestamp (160 samples por packet para 20ms a 8kHz)
      session.timestamp += 160;

      return true;

    } catch (err) {
      console.error('[SIMPLE_RTP] Error encoding/sending audio:', err);
      return false;
    }
  }

  /**
   * Decode G.711 μ-law to PCM16 (simplified)
   */
  private decodePCMU(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length * 2);
    
    for (let i = 0; i < input.length; i++) {
      // Simplified μ-law decode
      const sample = this.mulaw2linear(input[i]);
      output.writeInt16LE(sample, i * 2);
    }
    
    return output;
  }

  /**
   * Decode G.711 A-law to PCM16 (simplified)
   */
  private decodePCMA(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length * 2);
    
    for (let i = 0; i < input.length; i++) {
      // Simplified A-law decode
      const sample = this.alaw2linear(input[i]);
      output.writeInt16LE(sample, i * 2);
    }
    
    return output;
  }

  /**
   * Encode PCM16 to G.711 μ-law (simplified)
   */
  private encodePCMU(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length / 2);
    
    for (let i = 0; i < output.length; i++) {
      const sample = input.readInt16LE(i * 2);
      output[i] = this.linear2mulaw(sample);
    }
    
    return output;
  }

  /**
   * μ-law decompression (simplified)
   */
  private mulaw2linear(mulaw: number): number {
    mulaw = ~mulaw;
    const sign = (mulaw & 0x80);
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    
    let sample = mantissa << 3;
    sample += 0x84;
    sample <<= exponent;
    
    if (sign !== 0) sample = -sample;
    
    return Math.max(-32767, Math.min(32767, sample));
  }

  /**
   * A-law decompression (simplified)
   */
  private alaw2linear(alaw: number): number {
    alaw ^= 0x55;
    
    const sign = (alaw & 0x80);
    const exponent = (alaw >> 4) & 0x07;
    const mantissa = alaw & 0x0F;
    
    let sample = mantissa << 4;
    
    if (exponent > 0) {
      sample += 0x100;
      sample <<= (exponent - 1);
    } else {
      sample += 0x08;
    }
    
    if (sign !== 0) sample = -sample;
    
    return Math.max(-32767, Math.min(32767, sample));
  }

  /**
   * μ-law compression (simplified)
   */
  private linear2mulaw(sample: number): number {
    const sign = (sample < 0) ? 0x80 : 0;
    sample = Math.abs(sample);
    if (sample > 32635) sample = 32635;
    sample += 0x84;
    
    let exponent = 7;
    for (let exp = 7; exp >= 0; exp--) {
      if (sample >= (256 << exp)) {
        exponent = exp;
        break;
      }
    }
    
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const mulaw = ~(sign | (exponent << 4) | mantissa);
    
    return mulaw & 0xFF;
  }

  /**
   * Get session info
   */
  getSession(callId: string): SimpleRTPSession | undefined {
    return this.sessions.get(callId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SimpleRTPSession[] {
    return Array.from(this.sessions.values()).filter(s => s.active);
  }
}

// Singleton instance
export const simpleRtpService = new SimpleRTPService();
