import dgram from 'dgram';
import { EventEmitter } from 'events';

/**
 * RTP Service - Implementação SEM rtp.js para evitar erro view.getUint8
 * Versão simplificada e robusta que não depende de bibliotecas externas
 */

interface RTPSession {
  callId: string;
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  payloadType: number;
  ssrc: number;
  sequenceNumber: number;
  timestamp: number;
  active: boolean;
}

class RTPService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private sessions: Map<string, RTPSession> = new Map();
  private port: number = 10000;
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  /**
   * Start RTP server
   */
  async start(port: number = 10000): Promise<void> {
    if (this.isRunning) {
      console.log('[RTP] Server already running');
      return;
    }

    this.port = port;
    this.socket = dgram.createSocket('udp4');

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create socket'));
        return;
      }

      this.socket.on('error', (err) => {
        console.error('[RTP] Socket error:', err);
        this.emit('error', err);
      });

      this.socket.on('message', (msg, rinfo) => {
        console.log(`[RTP] 📥 INCOMING: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
        this.handleIncomingRTP(msg, rinfo);
      });

      this.socket.on('listening', () => {
        const address = this.socket!.address();
        console.log(`[RTP] Server listening on ${address.address}:${address.port}`);
        this.isRunning = true;
        resolve();
      });

      this.socket.bind(this.port, '0.0.0.0', () => {
        console.log(`[RTP] Binding to port ${this.port}`);
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
        console.log('[RTP] Server stopped');
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
    remotePort: number,
    payloadType: number = 0
  ): RTPSession {
    const session: RTPSession = {
      callId,
      remoteAddress,
      remotePort,
      localPort: this.port,
      payloadType,
      ssrc: Math.floor(Math.random() * 0xFFFFFFFF),
      sequenceNumber: Math.floor(Math.random() * 0xFFFF),
      timestamp: 0,
      active: true,
    };

    this.sessions.set(callId, session);
    console.log(`[RTP] Session created for call ${callId} -> ${remoteAddress}:${remotePort}`);
    
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
      console.log(`[RTP] Session ended for call ${callId}`);
    }
  }

  /**
   * Handle incoming RTP packets - SEM rtp.js
   */
  private handleIncomingRTP(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      // Validação básica sem usar rtp.js
      if (!msg || msg.length < 12) {
        return; // Silently ignore invalid packets
      }

      // Parse RTP header manualmente (SEM bibliotecas externas)
      const version = (msg[0] >> 6) & 0x03;
      const payloadType = msg[1] & 0x7F;
      
      // Validar se é RTP válido
      if (version !== 2) {
        return; // Não é RTP versão 2
      }

      // Encontrar sessão correspondente
      const session = Array.from(this.sessions.values()).find(
        s => s.remoteAddress === rinfo.address && s.remotePort === rinfo.port
      );

      if (!session) {
        // Atualizar primeira sessão ativa com endereço remoto
        const activeSession = Array.from(this.sessions.values()).find(s => s.active);
        if (activeSession) {
          activeSession.remoteAddress = rinfo.address;
          activeSession.remotePort = rinfo.port;
          console.log(`[RTP] Updated session ${activeSession.callId} with remote ${rinfo.address}:${rinfo.port}`);
          this.processAudioPacket(activeSession, msg, payloadType);
        }
        return;
      }

      this.processAudioPacket(session, msg, payloadType);

    } catch (err) {
      // SILENTLY ignore errors to prevent spam
      // console.error('[RTP] Packet processing error:', err);
    }
  }

  /**
   * Process audio from RTP packet - SEM rtp.js
   */
  private processAudioPacket(session: RTPSession, msg: Buffer, payloadType: number): void {
    try {
      // Extrair payload (após header de 12 bytes)
      const payloadStart = 12;
      const payloadData = msg.subarray(payloadStart);
      
      if (payloadData.length === 0) {
        return;
      }

      // Decodificar baseado no payload type
      let audioData: Buffer;
      
      if (payloadType === 0) {
        // PCMU (G.711 μ-law)
        audioData = this.decodePCMU(payloadData);
      } else if (payloadType === 8) {
        // PCMA (G.711 A-law)
        audioData = this.decodePCMA(payloadData);
      } else {
        return; // Payload type não suportado
      }

      // Emitir evento de áudio
      this.emit('audio', {
        callId: session.callId,
        audioData,
        sampleRate: 8000,
        channels: 1,
        format: 'pcm16',
      });

    } catch (err) {
      // Silently ignore processing errors
    }
  }

  /**
   * Send audio via RTP - SEM rtp.js
   */
  sendAudio(callId: string, audioBuffer: Buffer, sampleRate: number = 8000): boolean {
    const session = this.sessions.get(callId);
    
    if (!session || !session.active || !this.socket) {
      return false;
    }

    try {
      // Encode audio to G.711
      const encodedAudio = this.encodePCMU(audioBuffer);

      // Create RTP header manually (12 bytes)
      const header = Buffer.alloc(12);
      header[0] = 0x80; // Version 2, no padding, no extension, no CSRC
      header[1] = session.payloadType; // Payload type
      header.writeUInt16BE(session.sequenceNumber++, 2);
      header.writeUInt32BE(session.timestamp, 4);
      header.writeUInt32BE(session.ssrc, 8);

      // Combine header + payload
      const packet = Buffer.concat([header, encodedAudio]);

      // Send packet
      this.socket.send(packet, session.remotePort, session.remoteAddress, (err) => {
        if (err) {
          console.error('[RTP] Error sending packet:', err);
        }
      });

      // Update timestamp
      session.timestamp += 160;
      return true;

    } catch (err) {
      console.error('[RTP] Error encoding/sending audio:', err);
      return false;
    }
  }

  /**
   * Decode G.711 μ-law to PCM16
   */
  private decodePCMU(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length * 2);
    
    for (let i = 0; i < input.length; i++) {
      const sample = this.mulaw2linear(input[i]);
      output.writeInt16LE(sample, i * 2);
    }
    
    return output;
  }

  /**
   * Decode G.711 A-law to PCM16
   */
  private decodePCMA(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length * 2);
    
    for (let i = 0; i < input.length; i++) {
      const sample = this.alaw2linear(input[i]);
      output.writeInt16LE(sample, i * 2);
    }
    
    return output;
  }

  /**
   * Encode PCM16 to G.711 μ-law
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
   * μ-law decompression
   */
  private mulaw2linear(mulaw: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    mulaw = ~mulaw;
    const sign = (mulaw & 0x80);
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    
    let sample = mantissa << 3;
    sample += BIAS;
    sample <<= exponent;
    
    if (sign !== 0) sample = -sample;
    
    return Math.max(-CLIP, Math.min(CLIP, sample));
  }

  /**
   * A-law decompression
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
    
    return sample;
  }

  /**
   * μ-law compression
   */
  private linear2mulaw(sample: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    const sign = (sample < 0) ? 0x80 : 0;
    sample = Math.abs(sample);
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;
    
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
  getSession(callId: string): RTPSession | undefined {
    return this.sessions.get(callId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): RTPSession[] {
    return Array.from(this.sessions.values()).filter(s => s.active);
  }
}

// Singleton instance - SUBSTITUI completamente a implementação anterior
export const rtpService = new RTPService();