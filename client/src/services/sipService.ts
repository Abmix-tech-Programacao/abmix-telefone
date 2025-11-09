import { UA, WebSocketInterface, Inviter, SessionState, URI } from 'sip.js';

interface SipConfig {
  server: string;
  username: string;
  password: string;
  domain: string;
}

export class SipService {
  private ua: UA | null = null;
  private currentSession: any = null;
  private isRegistered = false;
  private config: SipConfig | null = null;

  constructor() {
    console.log('[SIP] Service initialized');
  }

  // Configure SIP connection
  async configure(config: SipConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Create WebSocket transport
      const transportOptions = {
        server: `wss://${config.server}:7443/ws` // SobreIP WebSocket SIP
      };

      const transport = new WebSocketInterface(transportOptions);

      // Create User Agent
      const userAgentOptions = {
        authorizationUsername: config.username,
        authorizationPassword: config.password,
        transportOptions,
        uri: URI.parse(`sip:${config.username}@${config.domain}`),
        delegate: {
          onConnect: () => {
            console.log('[SIP] Connected to server');
          },
          onDisconnect: (error?: Error) => {
            console.log('[SIP] Disconnected:', error?.message || 'Unknown reason');
            this.isRegistered = false;
          },
          onInvite: (invitation: any) => {
            console.log('[SIP] Incoming call from:', invitation.remoteIdentity.uri);
            // Handle incoming calls
            this.handleIncomingCall(invitation);
          }
        }
      };

      this.ua = new UA(userAgentOptions);

      // Start the UA
      await this.ua.start();
      
      console.log('[SIP] User Agent started');
      return true;

    } catch (error) {
      console.error('[SIP] Configuration error:', error);
      return false;
    }
  }

  // Register with SIP server
  async register(): Promise<boolean> {
    if (!this.ua) {
      console.error('[SIP] UA not configured');
      return false;
    }

    try {
      await this.ua.register();
      this.isRegistered = true;
      console.log('[SIP] Registration successful');
      return true;
    } catch (error) {
      console.error('[SIP] Registration failed:', error);
      return false;
    }
  }

  // Make outgoing call
  async makeCall(targetNumber: string): Promise<string | null> {
    if (!this.ua || !this.isRegistered) {
      console.error('[SIP] Not registered or UA not available');
      return null;
    }

    try {
      // Clean target number
      const cleanNumber = targetNumber.replace(/[^\d+]/g, '');
      const target = URI.parse(`sip:${cleanNumber}@${this.config?.domain}`);

      if (!target) {
        throw new Error('Invalid target URI');
      }

      // Create inviter
      const inviter = new Inviter(this.ua, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      // Setup session delegates
      inviter.stateChange.addListener((state: SessionState) => {
        console.log('[SIP] Call state changed:', state);
        
        switch (state) {
          case SessionState.Establishing:
            console.log('[SIP] Call establishing...');
            break;
          case SessionState.Established:
            console.log('[SIP] Call established');
            this.handleCallEstablished(inviter);
            break;
          case SessionState.Terminated:
            console.log('[SIP] Call terminated');
            this.currentSession = null;
            break;
        }
      });

      // Send INVITE
      await inviter.invite();
      this.currentSession = inviter;

      const callId = `sip_${Date.now()}`;
      console.log('[SIP] Call initiated:', callId, 'to', cleanNumber);
      
      return callId;

    } catch (error) {
      console.error('[SIP] Call failed:', error);
      return null;
    }
  }

  // Handle established call
  private handleCallEstablished(session: any) {
    try {
      // Setup audio streams
      const remoteStream = session.sessionDescriptionHandler?.remoteMediaStream;
      const localStream = session.sessionDescriptionHandler?.localMediaStream;

      if (remoteStream) {
        // Create audio element for remote audio
        const remoteAudio = new Audio();
        remoteAudio.srcObject = remoteStream;
        remoteAudio.autoplay = true;
        remoteAudio.controls = false;
        
        // Add to DOM temporarily for playback
        document.body.appendChild(remoteAudio);
        
        // Remove after call ends
        session.stateChange.addListener((state: SessionState) => {
          if (state === SessionState.Terminated) {
            document.body.removeChild(remoteAudio);
          }
        });
      }

      if (localStream) {
        // Handle local audio for recording/processing
        console.log('[SIP] Local audio stream available');
      }

    } catch (error) {
      console.error('[SIP] Error setting up audio streams:', error);
    }
  }

  // Handle incoming call
  private handleIncomingCall(invitation: any) {
    console.log('[SIP] Incoming call handling not implemented yet');
    // For now, reject incoming calls
    invitation.reject();
  }

  // Hangup current call
  async hangup(): Promise<boolean> {
    if (!this.currentSession) {
      console.warn('[SIP] No active session to hangup');
      return false;
    }

    try {
      await this.currentSession.bye();
      this.currentSession = null;
      console.log('[SIP] Call hung up');
      return true;
    } catch (error) {
      console.error('[SIP] Hangup error:', error);
      return false;
    }
  }

  // Send DTMF
  async sendDTMF(digit: string): Promise<boolean> {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
      console.warn('[SIP] No established session for DTMF');
      return false;
    }

    try {
      const options = {
        requestOptions: {
          body: {
            contentDisposition: 'render',
            contentType: 'application/dtmf-relay',
            content: `Signal=${digit}\r\nDuration=100`
          }
        }
      };

      await this.currentSession.info(options);
      console.log('[SIP] DTMF sent:', digit);
      return true;
    } catch (error) {
      console.error('[SIP] DTMF error:', error);
      return false;
    }
  }

  // Hold/Unhold call
  async hold(hold: boolean = true): Promise<boolean> {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
      console.warn('[SIP] No established session for hold');
      return false;
    }

    try {
      if (hold) {
        await this.currentSession.hold();
        console.log('[SIP] Call held');
      } else {
        await this.currentSession.unhold();
        console.log('[SIP] Call unheld');
      }
      return true;
    } catch (error) {
      console.error('[SIP] Hold error:', error);
      return false;
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.isRegistered && this.ua?.isConnected() === true;
  }

  // Get call status
  hasActiveCall(): boolean {
    return this.currentSession !== null && this.currentSession.state === SessionState.Established;
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      if (this.currentSession) {
        await this.hangup();
      }
      
      if (this.ua) {
        await this.ua.unregister();
        await this.ua.stop();
        this.ua = null;
      }
      
      this.isRegistered = false;
      console.log('[SIP] Disconnected and cleaned up');
    } catch (error) {
      console.error('[SIP] Cleanup error:', error);
    }
  }
}

// Global SIP service instance
export const sipService = new SipService();
