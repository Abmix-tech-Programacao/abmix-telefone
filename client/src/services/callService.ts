import { sipService } from './sipService';

export interface CallSession {
  callId: string;
  phoneNumber: string;
  status: 'dialing' | 'ringing' | 'connected' | 'ended';
  startTime: Date;
  isRecording: boolean;
  audioStream?: MediaStream;
}

export class CallService {
  private currentCall: CallSession | null = null;
  private audioContext: AudioContext | null = null;
  private microphone: MediaStream | null = null;
  private callbacks: { [event: string]: Function[] } = {};

  constructor() {
    console.log('[CALL_SERVICE] Initialized');
  }

  // Register event callbacks
  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  // Emit events
  private emit(event: string, data?: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  // Initialize audio context and microphone
  async initializeAudio(): Promise<boolean> {
    try {
      // Get microphone access
      this.microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        },
        video: false
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      console.log('[CALL_SERVICE] Audio initialized');
      return true;

    } catch (error) {
      console.error('[CALL_SERVICE] Audio initialization failed:', error);
      return false;
    }
  }

  // Start a call
  async startCall(phoneNumber: string, fromNumberId: string): Promise<string | null> {
    try {
      // Initialize audio first
      const audioReady = await this.initializeAudio();
      if (!audioReady) {
        throw new Error('Falha ao inicializar áudio - permita acesso ao microfone');
      }

      // Make API call to backend
      const response = await fetch('/api/call/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          from_number_id: fromNumberId,
          voiceType: 'masc'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao iniciar chamada');
      }

      const result = await response.json();
      
      // Create call session
      this.currentCall = {
        callId: result.callSid,
        phoneNumber,
        status: 'dialing',
        startTime: new Date(),
        isRecording: false,
        audioStream: this.microphone || undefined
      };

      // Simulate call progression
      this.simulateCallProgression();

      // Start recording automatically
      setTimeout(() => {
        this.startRecording();
      }, 2000);

      this.emit('callStarted', this.currentCall);
      
      console.log('[CALL_SERVICE] Call started:', result.callSid);
      return result.callSid;

    } catch (error) {
      console.error('[CALL_SERVICE] Start call error:', error);
      this.emit('callError', error);
      return null;
    }
  }

  // Simulate call progression (dialing -> ringing -> connected)
  private simulateCallProgression() {
    if (!this.currentCall) return;

    // Dialing -> Ringing
    setTimeout(() => {
      if (this.currentCall) {
        this.currentCall.status = 'ringing';
        this.emit('callStateChanged', this.currentCall);
        console.log('[CALL_SERVICE] Call ringing');
      }
    }, 1000);

    // Ringing -> Connected
    setTimeout(() => {
      if (this.currentCall) {
        this.currentCall.status = 'connected';
        this.emit('callStateChanged', this.currentCall);
        console.log('[CALL_SERVICE] Call connected');
        
        // Start AI conversation
        this.initializeAIConversation();
      }
    }, 3000);
  }

  // Initialize AI conversation for the call
  private async initializeAIConversation() {
    if (!this.currentCall) return;

    try {
      const response = await fetch(`/api/ai/conversation/${this.currentCall.callId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: "Você é um assistente telefônico brasileiro profissional. Responda de forma natural, simpática e concisa. Mantenha as respostas curtas para conversas por telefone."
        })
      });

      if (response.ok) {
        console.log('[CALL_SERVICE] AI conversation initialized');
        this.emit('aiInitialized', this.currentCall.callId);
      }
    } catch (error) {
      console.error('[CALL_SERVICE] AI initialization error:', error);
    }
  }

  // Start recording
  async startRecording(): Promise<boolean> {
    if (!this.currentCall) return false;

    try {
      const response = await fetch(`/api/recording/${this.currentCall.callId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: this.currentCall.phoneNumber
        })
      });

      if (response.ok) {
        this.currentCall.isRecording = true;
        this.emit('recordingStarted', this.currentCall.callId);
        console.log('[CALL_SERVICE] Recording started');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[CALL_SERVICE] Recording error:', error);
      return false;
    }
  }

  // Send DTMF
  async sendDTMF(digit: string): Promise<boolean> {
    if (!this.currentCall || this.currentCall.status !== 'connected') return false;

    try {
      const response = await fetch('/api/call/dtmf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSid: this.currentCall.callId,
          digit
        })
      });

      if (response.ok) {
        console.log('[CALL_SERVICE] DTMF sent:', digit);
        this.emit('dtmfSent', { callId: this.currentCall.callId, digit });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[CALL_SERVICE] DTMF error:', error);
      return false;
    }
  }

  // Hangup call
  async hangup(): Promise<boolean> {
    if (!this.currentCall) return false;

    try {
      const response = await fetch('/api/call/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSid: this.currentCall.callId
        })
      });

      // Stop recording
      if (this.currentCall.isRecording) {
        await fetch(`/api/recording/${this.currentCall.callId}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Cleanup audio
      if (this.microphone) {
        this.microphone.getTracks().forEach(track => track.stop());
        this.microphone = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      const callId = this.currentCall.callId;
      this.currentCall = null;

      this.emit('callEnded', callId);
      console.log('[CALL_SERVICE] Call ended');
      
      return true;

    } catch (error) {
      console.error('[CALL_SERVICE] Hangup error:', error);
      return false;
    }
  }

  // Get current call
  getCurrentCall(): CallSession | null {
    return this.currentCall;
  }

  // Check if call is active
  hasActiveCall(): boolean {
    return this.currentCall !== null && this.currentCall.status !== 'ended';
  }
}

// Global call service instance
export const callService = new CallService();

