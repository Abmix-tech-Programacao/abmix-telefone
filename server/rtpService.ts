import dgram from 'dgram';
import { EventEmitter } from 'events';
import { RtpPacket } from 'rtp.js/packets';

/**
 * RTP Media Server
 * Handles RTP audio streams for SIP calls
 * Supports PCMU (G.711 μ-law) and PCMA (G.711 A-law) codecs
 */

interface RTPSession {
  callId: string;
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  payloadType: number; // 0=PCMU, 8=PCMA
  ssrc: number;
  sequenceNumber: number;
  timestamp: number;
  active: boolean;
}

class RTPService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private sessions: Map<string, RTPSession> = new Map();
  private port: number = 8000;
  private isRunning: boolean = false;
  private inRtpCount: number = 0;
  private outRtpCount: number = 0;
  private statsTimer: NodeJS.Timeout | null = null;

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
        this.handleIncomingRTP(msg, rinfo);
      });

      this.socket.on('listening', () => {
        const address = this.socket!.address();
        console.log(`[RTP] Server listening on ${address.address}:${address.port}`);
        this.isRunning = true;

        // Periodic stats
        if (this.statsTimer) clearInterval(this.statsTimer);
        this.statsTimer = setInterval(() => {
          if (!this.isRunning) return;
          const active = this.getActiveSessions().length;
          console.log(`[RTP] Stats: in=${this.inRtpCount} out=${this.outRtpCount} active_sessions=${active}`);
          this.inRtpCount = 0;
          this.outRtpCount = 0;
        }, 5000);
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
        if (this.statsTimer) {
          clearInterval(this.statsTimer);
          this.statsTimer = null;
        }
        resolve();
      });
    });
  }

  /**
   * Create new RTP session for a call
   */
  createSession(
    callId: string,
    remoteAddress: string,
    remotePort: number,
    payloadType: number = 0 // Default to PCMU
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
   * Handle incoming RTP packets
   */
  private handleIncomingRTP(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      // CORREÇÃO OPENAI: Converter Buffer para DataView
      const dv = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
      const packet = new RtpPacket(dv as any);
      
      // Validação básica
      if (!msg || msg.length < 12) {
        return; // Silently ignore invalid packets
      }
      
      const payloadType = packet.getPayloadType();
      
      // Find session by remote address/port
      const session = Array.from(this.sessions.values()).find(
        s => s.remoteAddress === rinfo.address && s.remotePort === rinfo.port
      );

      if (!session) {
        // Unknown session - might be first packet, try to match by any active session
        const activeSession = Array.from(this.sessions.values()).find(s => s.active);
        if (activeSession) {
          // Update session with actual remote address/port
          activeSession.remoteAddress = rinfo.address;
          activeSession.remotePort = rinfo.port;
          console.log(`[RTP] ✅ Updated session ${activeSession.callId} with remote ${rinfo.address}:${rinfo.port}`);
          this.processAudioPacket(activeSession, packet);
          this.inRtpCount++;
        } else {
          // DEBUG: mostrar todas as sessões disponíveis
          console.log(`[RTP] ❌ No active session for ${rinfo.address}:${rinfo.port}. Sessions:`, 
            Array.from(this.sessions.entries()).map(([id, s]) => ({id, active: s.active, remote: `${s.remoteAddress}:${s.remotePort}`})));
        }
        return;
      }

      this.processAudioPacket(session, packet);
      this.inRtpCount++;

    } catch (err) {
      console.error('[RTP] Failed to parse RTP packet:', err);
    }
  }

  /**
   * Process audio from RTP packet
   */
  private processAudioPacket(session: RTPSession, packet: RtpPacket): void {
    const payloadData = packet.getPayload();
    if (!payloadData || payloadData.byteLength === 0) {
      return;
    }

    // Convert DataView to Buffer
    const payloadBuffer = Buffer.from(payloadData.buffer, payloadData.byteOffset, payloadData.byteLength);

    // Decode audio based on payload type
    let audioData: Buffer;
    const payloadType = packet.getPayloadType();
    
    if (payloadType === 0) {
      // PCMU (G.711 μ-law)
      audioData = this.decodePCMU(payloadBuffer);
    } else if (payloadType === 8) {
      // PCMA (G.711 A-law)
      audioData = this.decodePCMA(payloadBuffer);
    } else {
      console.log(`[RTP] Unsupported payload type: ${payloadType}`);
      return;
    }

    // Emit audio data for processing (STT)
    this.emit('audio', {
      callId: session.callId,
      audioData,
      sampleRate: 8000, // G.711 is always 8kHz
      channels: 1,
      format: 'pcm16',
    });
  }

  /**
   * Send audio via RTP
   */
  sendAudio(callId: string, audioBuffer: Buffer, sampleRate: number = 8000): boolean {
    const session = this.sessions.get(callId);
    
    if (!session || !session.active || !this.socket) {
      // DEBUG: Log mais detalhado
      console.log(`[RTP] ❌ sendAudio FAILED: session=${!!session}, active=${session?.active}, socket=${!!this.socket}, callId=${callId}`);
      return false;
    }

    try {
      // Encode audio to G.711
      let encodedAudio: Buffer;
      if (session.payloadType === 0) {
        encodedAudio = this.encodePCMU(audioBuffer);
      } else if (session.payloadType === 8) {
        encodedAudio = this.encodePCMA(audioBuffer);
      } else {
        console.log(`[RTP] Unsupported payload type for encoding: ${session.payloadType}`);
        return false;
      }

      // Create RTP packet using rtp.js (CORREÇÃO OPENAI)
      const packet = new RtpPacket();
      
      // Set packet properties
      packet.setPayloadType(session.payloadType);
      packet.setSequenceNumber(session.sequenceNumber++);
      packet.setTimestamp(session.timestamp);
      packet.setSsrc(session.ssrc);
      packet.setMarker(false);
      packet.setPayload(encodedAudio as any);

      // Update timestamp (160 samples per packet for 20ms at 8kHz)
      session.timestamp += 160;

      // Serialize packet
      const byteLength = packet.getByteLength();
      const buffer = Buffer.alloc(byteLength);
      packet.serialize(buffer.buffer);
      
      // Send packet
      this.socket.send(buffer, session.remotePort, session.remoteAddress, (err) => {
        if (err) {
          console.error('[RTP] Error sending packet:', err);
        }
      });

      this.outRtpCount++;
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
   * Encode PCM16 to G.711 A-law
   */
  private encodePCMA(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length / 2);
    
    for (let i = 0; i < output.length; i++) {
      const sample = input.readInt16LE(i * 2);
      output[i] = this.linear2alaw(sample);
    }
    
    return output;
  }

  /**
   * μ-law decompression (lookup table method)
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
   * A-law compression
   */
  private linear2alaw(sample: number): number {
    const sign = (sample < 0) ? 0 : 0x80;
    sample = Math.abs(sample);
    
    if (sample > 32635) sample = 32635;
    
    let exponent = 7;
    for (let exp = 7; exp >= 0; exp--) {
      if (sample >= (256 << exp)) {
        exponent = exp;
        break;
      }
    }
    
    const mantissa = (sample >> (exponent + 4)) & 0x0F;
    const alaw = sign | (exponent << 4) | mantissa;
    
    return alaw ^ 0x55;
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

// Singleton instance
export const rtpService = new RTPService();
