import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rtpService } from './rtpService';
import { realtimeVoiceService } from './realtimeVoiceService';

const require = createRequire(import.meta.url);

// Load SIP module (CommonJS only - uses require())
// NOTE: sip.send and sip.stop are created INSIDE sip.start(), not at module load time!
// @ts-ignore - Module 'sip' has no type definitions
const sip = require('sip');
// @ts-ignore
const digest = require('sip/digest');

// Verify sip.start exists (sip.send/stop are created by sip.start())
if (typeof sip.start !== 'function') {
  console.error('[SIP_MODULE] ❌ sip.start is not a function!');
  console.error('[SIP_MODULE] Available keys:', Object.keys(sip));
  throw new Error('SIP module failed to load properly - sip.start not available');
}

console.log('[SIP_MODULE] ✅ SIP module loaded successfully');
console.log('[SIP_MODULE] sip.start: available (send/stop will be created when start() is called)');

const execAsync = promisify(exec);

interface SIPDialog {
  local: any;
  remote: any;
  routeSet: any[];
  cseq: number;
  inviteRequest: any;
  lastResponse: any;
}

interface SIPCall {
  callId: string;
  toNumber: string;
  fromNumber: string;
  dialog?: SIPDialog;
  status: 'initiating' | 'ringing' | 'answered' | 'ended' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
  voiceType?: string;
}

// Global flag to track if SIP stack was started (singleton pattern)
let globalSipStarted = false;

// Global singleton instance of SIPService
let globalSipServiceInstance: SIPService | null = null;

export class SIPService {
  private initialized: boolean = false;
  private activeCalls: Map<string, SIPCall> = new Map();
  private sipUsername: string;
  private sipPassword: string;
  private sipServer: string;
  private sipPort: number;
  private localIP: string;
  private fromNumber: string;
  private authSession: any = {};
  private authChallengeResponse: any = null; // Store 401 response for digest signing
  private registered: boolean = false;
  private clientPort: number = 6060;
  private transport: 'TCP' | 'UDP' = 'UDP'; // Store active transport protocol
  private registrationPromise: Promise<void> | null = null;
  private registrationResolve: (() => void) | null = null;
  private registrationReject: ((error: Error) => void) | null = null;

  private constructor(
    sipUsername: string,
    sipPassword: string,
    sipServer: string,
    fromNumber: string,
    sipPort: number = 5060
  ) {
    this.sipUsername = sipUsername;
    this.sipPassword = sipPassword;
    this.sipServer = sipServer;
    this.sipPort = sipPort;
    this.fromNumber = fromNumber;
    // PUBLIC_IP is REQUIRED - will be validated in initialize()
    this.localIP = '0.0.0.0'; // Placeholder, will be set in initialize()
  }

  // Singleton getInstance method
  static getInstance(
    sipUsername: string,
    sipPassword: string,
    sipServer: string,
    fromNumber: string,
    sipPort: number = 5060
  ): SIPService {
    if (!globalSipServiceInstance) {
      console.log('[SIP_SERVICE] Creating new global SIPService instance');
      globalSipServiceInstance = new SIPService(sipUsername, sipPassword, sipServer, fromNumber, sipPort);
    } else {
      console.log('[SIP_SERVICE] Reusing existing global SIPService instance');
    }
    return globalSipServiceInstance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[SIP_SERVICE] Already initialized');
      return;
    }

    try {
      // PUBLIC_IP is MANDATORY for production RTP audio to work
      if (!process.env.PUBLIC_IP || process.env.PUBLIC_IP.trim() === '') {
        throw new Error(
          '❌ PUBLIC_IP environment variable is REQUIRED!\n' +
          'The system needs your VPS public IP address for RTP audio to work.\n' +
          'Add PUBLIC_IP to your environment variables (e.g., PUBLIC_IP=72.60.149.107)\n' +
          'See DEPLOY.md section 4.4 for instructions on how to find your public IP.'
        );
      }
      
      const publicIP = process.env.PUBLIC_IP.trim();
      
      // Validate IP format (IPv4 only)
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = publicIP.match(ipv4Regex);
      
      if (!match) {
        throw new Error(
          `❌ PUBLIC_IP "${publicIP}" is not a valid IPv4 address!\n` +
          'Expected format: xxx.xxx.xxx.xxx (e.g., 72.60.149.107)\n' +
          'See DEPLOY.md section 4.4 for instructions on how to find your public IP.'
        );
      }
      
      // Validate octets are in valid range (0-255)
      const octets = [
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3]),
        parseInt(match[4])
      ];
      
      if (octets.some(octet => octet < 0 || octet > 255)) {
        throw new Error(
          `❌ PUBLIC_IP "${publicIP}" contains invalid octets!\n` +
          'Each number must be between 0 and 255.\n' +
          'See DEPLOY.md section 4.4 for instructions on how to find your public IP.'
        );
      }
      
      // Reject private IP ranges (RFC1918) and loopback
      const isPrivate = 
        octets[0] === 10 || // 10.0.0.0/8
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || // 172.16.0.0/12
        (octets[0] === 192 && octets[1] === 168) || // 192.168.0.0/16
        octets[0] === 127; // 127.0.0.0/8 (loopback)
      
      if (isPrivate) {
        throw new Error(
          `❌ PUBLIC_IP "${publicIP}" is a PRIVATE IP address!\n` +
          'You must use your VPS PUBLIC (external) IP address, not a private/internal IP.\n' +
          'Private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x\n' +
          'See DEPLOY.md section 4.4 for instructions on how to find your PUBLIC IP.'
        );
      }
      
      this.localIP = publicIP;
      console.log('[SIP_SERVICE] ✅ Using validated PUBLIC_IP:', this.localIP);

      console.log('[SIP_SERVICE] Initializing SIP stack...');
      console.log(`[SIP_SERVICE] Local IP: ${this.localIP}`);
      console.log(`[SIP_SERVICE] Server: ${this.sipServer}:${this.sipPort}`);
      console.log(`[SIP_SERVICE] Username: ${this.sipUsername}`);
      
      // Get SIP client port from environment variable (default: 6060)
      this.clientPort = parseInt(process.env.FALEVONO_SIP_PORT || '6060', 10);
      
      // Determine transport protocol (UDP or TCP)
      // NOTE: UDP is blocked in Replit development environment - use TCP or deploy to production
      const useTCP = process.env.SIP_USE_TCP === 'true' || process.env.NODE_ENV === 'development';
      this.transport = useTCP ? 'TCP' : 'UDP'; // Store for use in headers
      
      // Start SIP stack only once (singleton pattern)
      if (!globalSipStarted) {
        console.log('[SIP_SERVICE] Starting SIP stack for the first time...');
        console.log(`[SIP_SERVICE] Transport: ${this.transport} ${useTCP ? '(UDP blocked in Replit dev)' : ''}`);
        console.log(`[SIP_SERVICE] Client Port: ${this.clientPort}`);
        
        sip.start({
          publicAddress: this.localIP,
          port: this.clientPort,
          tcp: useTCP,
          logger: {
            send: (message: any) => {
              console.log('[SIP_SERVICE] >>> SENT:', JSON.stringify(message, null, 2).substring(0, 500));
            },
            recv: (message: any) => {
              console.log('[SIP_SERVICE] <<< RECEIVED:', JSON.stringify(message, null, 2).substring(0, 500));
              this.handleIncomingMessage(message);
          }
          }
        }, (request: any) => {
          this.handleIncomingRequest(request);
        });
        
        // Wait for SIP stack to fully initialize (sip.send becomes available)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Debug: Check if sip.send appeared after start()
        console.log('[SIP_SERVICE] After sip.start() - checking functions...');
        console.log('[SIP_SERVICE] sip.send type:', typeof sip.send);
        console.log('[SIP_SERVICE] sip.stop type:', typeof sip.stop);
        console.log('[SIP_SERVICE] All sip keys:', Object.keys(sip));
        
        // Verify sip.send is available
        if (typeof sip.send !== 'function') {
          console.error('[SIP_SERVICE] ❌ sip.send is STILL not available after sip.start()!');
          console.error('[SIP_SERVICE] This suggests the module structure changed or bundling issue');
          // Try alternate access pattern
          const sipModule = require('sip');
          console.log('[SIP_SERVICE] Direct require keys:', Object.keys(sipModule));
          throw new Error('SIP stack failed to initialize properly - sip.send not available');
        }
        
        globalSipStarted = true;
        console.log('[SIP_SERVICE] ✅ SIP stack started successfully');
      } else {
        console.log('[SIP_SERVICE] Reusing existing SIP stack');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.initialized = true;
      console.log('[SIP_SERVICE] ✅ SIP stack initialized successfully');
      
      // Create registration promise
      this.registrationPromise = new Promise((resolve, reject) => {
        this.registrationResolve = resolve;
        this.registrationReject = reject;
        
        // Set timeout for registration (15 seconds for TCP, 10 for UDP)
        const timeout = useTCP ? 15000 : 10000;
        setTimeout(() => {
          if (!this.registered) {
            const env = process.env.NODE_ENV || 'production';
            let errorMsg = `SIP registration timeout after ${timeout / 1000} seconds`;
            
            if (env === 'development') {
              errorMsg += '\n\n⚠️  REPLIT LIMITATION: UDP ports are blocked in development.\n';
              errorMsg += 'Solutions:\n';
              errorMsg += '1. Set SIP_USE_TCP=true to try TCP (may not work with all providers)\n';
              errorMsg += '2. Deploy to production (EasyPanel/VPS) where UDP works\n';
              errorMsg += '3. Test locally with Docker\n';
            }
            
            reject(new Error(errorMsg));
          }
        }, timeout);
      });
      
      // Register with server
      await this.register();
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  private async register(isReauth: boolean = false): Promise<void> {
    console.log(`[SIP_SERVICE] ${isReauth ? 'Re-registering with auth' : 'Registering'}...`);
    
    const callId = this.authSession.callId || randomUUID();
    const tag = this.authSession.tag || randomUUID();
    const cseq = (this.authSession.cseq || 0) + 1;
    
    this.authSession.callId = callId;
    this.authSession.tag = tag;
    this.authSession.cseq = cseq;
    
    try {
      // Build contact URI with transport parameter if using TCP
      const contactUri = this.transport === 'TCP' 
        ? `sip:${this.sipUsername}@${this.localIP}:${this.clientPort};transport=tcp`
        : `sip:${this.sipUsername}@${this.localIP}:${this.clientPort}`;
      
      const registerRequest: any = {
        method: 'REGISTER',
        uri: `sip:${this.sipServer}:${this.sipPort}`,
        headers: {
          to: { uri: `sip:${this.sipUsername}@${this.sipServer}` },
          from: { 
            uri: `sip:${this.sipUsername}@${this.sipServer}`,
            params: { tag }
          },
          'call-id': callId,
          cseq: { method: 'REGISTER', seq: cseq },
          contact: [{ uri: contactUri }],
          expires: 3600,
          via: []
        }
      };
      
      console.log(`[SIP_SERVICE] REGISTER with transport=${this.transport}, contact=${contactUri}`);

      // Add digest authentication if this is a re-auth attempt
      if (isReauth && this.authChallengeResponse) {
        console.log('[SIP_SERVICE] Auth session state:', JSON.stringify(this.authSession, null, 2));
        
        const credentials = {
          user: this.sipUsername,
          password: this.sipPassword
        };
        
        try {
          // CRITICAL: signRequest needs 4 parameters: (session, request, challenge, credentials)
          digest.signRequest(this.authSession, registerRequest, this.authChallengeResponse, credentials);
          console.log('[SIP_SERVICE] ✅ Authorization header added successfully');
        } catch (signError) {
          console.error('[SIP_SERVICE] ❌ Failed to sign request:', signError);
          throw signError;
        }
      }
      
      // Note: callback receives SIP responses, not errors - responses handled in handleIncomingResponse
      sip.send(registerRequest);
      console.log('[SIP_SERVICE] REGISTER request queued');
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Registration failed:', error);
    }
  }

  async makeCall(toNumber: string, voiceType: string = 'masc'): Promise<string> {
    // If not initialized or registration failed, force re-initialization
    if (!this.initialized || !this.registered) {
      console.log(`[SIP_SERVICE] ${!this.initialized ? 'Not initialized' : 'Not registered'}, initializing...`);
      
      // Reset state if previous attempt failed
      if (this.initialized && !this.registered) {
        console.log('[SIP_SERVICE] Resetting failed SIP instance...');
        this.initialized = false;
        this.registered = false;
        this.authSession = {};
        this.activeCalls.clear();
      }
      
      await this.initialize();
    }

    // Wait for registration to complete (with timeout)
    if (!this.registered) {
      console.log('[SIP_SERVICE] Waiting for SIP registration to complete...');
      try {
        await this.registrationPromise;
        console.log('[SIP_SERVICE] Registration completed, proceeding with call');
      } catch (error) {
        // Mark as uninitialized so next call will retry
        this.initialized = false;
        this.registered = false;
        throw new Error(`Cannot make call: ${error instanceof Error ? error.message : 'Registration failed'}`);
      }
    }

    const callId = randomUUID();
    const tag = randomUUID();
    const branch = `z9hG4bK${randomUUID()}`;
    
    // Clean phone number (remove non-digits)
    const cleanNumber = toNumber.replace(/[^\d]/g, '');
    
    const call: SIPCall = {
      callId,
      toNumber: cleanNumber,
      fromNumber: this.fromNumber,
      status: 'initiating',
      startTime: new Date(),
      voiceType
    };
    
    this.activeCalls.set(callId, call);
    
    console.log('[SIP_SERVICE] 📞 Making call...');
    console.log(`[SIP_SERVICE]   From: ${this.fromNumber} (${this.sipUsername})`);
    console.log(`[SIP_SERVICE]   To: ${cleanNumber}`);
    console.log(`[SIP_SERVICE]   Call-ID: ${callId}`);
    
    // Create minimal SDP for audio-only call
    const sdp = this.createSDP();
    
    try {
      // Build contact URI with transport parameter if using TCP
      const contactUri = this.transport === 'TCP' 
        ? `sip:${this.sipUsername}@${this.localIP}:${this.clientPort};transport=tcp`
        : `sip:${this.sipUsername}@${this.localIP}:${this.clientPort}`;
      
      const inviteRequest: any = {
        method: 'INVITE',
        uri: `sip:${cleanNumber}@${this.sipServer}:${this.sipPort}`,
        headers: {
          to: { uri: `sip:${cleanNumber}@${this.sipServer}` },
          from: { 
            uri: `sip:${this.sipUsername}@${this.sipServer}`,
            params: { tag }
          },
          'call-id': callId,
          cseq: { method: 'INVITE', seq: 1 },
          contact: [{ uri: contactUri }],
          'content-type': 'application/sdp',
          via: [{
            version: '2.0',
            protocol: this.transport, // Use configured transport (TCP or UDP)
            host: this.localIP,
            port: this.clientPort,
            params: { branch }
          }]
        },
        content: sdp
      };
      
      console.log(`[SIP_SERVICE] INVITE with transport=${this.transport}, contact=${contactUri}`);

      // Store invite request for later use in ACK/CANCEL
      if (!call.dialog) {
        call.dialog = {
          local: inviteRequest.headers.from,
          remote: inviteRequest.headers.to,
          routeSet: [],
          cseq: 1,
          inviteRequest: inviteRequest,
          lastResponse: null
        };
      }
      
      // Note: callback receives SIP responses, not errors - responses handled in handleIncomingResponse
      sip.send(inviteRequest);
      return callId;
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to send INVITE:', error);
      call.status = 'failed';
      call.error = String(error);
      call.endTime = new Date();
      throw error;
    }
  }

  private async reInviteWithAuth(call: SIPCall, authResponse: any): Promise<void> {
    if (!call.dialog || !call.dialog.inviteRequest) {
      console.error(`[SIP_SERVICE] ❌ No stored INVITE for re-authentication`);
      call.status = 'failed';
      call.error = 'Cannot re-authenticate without original INVITE';
      call.endTime = new Date();
      return;
    }

    console.log(`[SIP_SERVICE] 🔐 Re-sending INVITE with digest authentication...`);
    console.log('[SIP_SERVICE] Auth challenge response:', JSON.stringify(authResponse.headers['proxy-authenticate'] || authResponse.headers['www-authenticate'], null, 2));

    try {
      // Create auth session for this call
      const callAuthSession: any = {};
      
      // Process the auth challenge
      digest.challenge(callAuthSession, authResponse);
      console.log('[SIP_SERVICE] ✅ Call auth session populated successfully');
      console.log('[SIP_SERVICE] Call auth session keys:', Object.keys(callAuthSession));
      
      // Clone the original INVITE request
      const reInviteRequest: any = JSON.parse(JSON.stringify(call.dialog.inviteRequest));
      
      // Increment CSeq for the re-attempt
      call.dialog.cseq++;
      reInviteRequest.headers.cseq.seq = call.dialog.cseq;
      
      // Add digest authentication
      const credentials = {
        user: this.sipUsername,
        password: this.sipPassword
      };
      
      // CRITICAL: signRequest needs 4 parameters: (session, request, challenge, credentials)
      digest.signRequest(callAuthSession, reInviteRequest, authResponse, credentials);
      console.log('[SIP_SERVICE] ✅ Authorization header added to INVITE successfully');
      
      // Update dialog state
      call.dialog.inviteRequest = reInviteRequest;
      
      // Send authenticated INVITE
      // Note: callback receives SIP responses, not errors
      sip.send(reInviteRequest);
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to re-send INVITE with auth:', error);
      call.status = 'failed';
      call.error = `Authentication failed: ${error}`;
      call.endTime = new Date();
    }
  }

  async hangup(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      console.warn(`[SIP_SERVICE] Call ${callId} not found`);
      return false;
    }

    console.log(`[SIP_SERVICE] 📴 Hanging up call ${callId} (status: ${call.status})`);
    
    try {
      if (call.status === 'answered' && call.dialog && call.dialog.lastResponse) {
        // Send BYE for established calls
        const contactUri = call.dialog.lastResponse.headers.contact?.[0]?.uri 
          || call.dialog.remote.uri;

        const byeRequest: any = {
          method: 'BYE',
          uri: contactUri,
          headers: {
            to: call.dialog.remote,
            from: call.dialog.local,
            'call-id': callId,
            cseq: { method: 'BYE', seq: call.dialog.cseq + 1 },
            via: call.dialog.inviteRequest.headers.via
          }
        };

        // Note: BYE is fire-and-forget
        sip.send(byeRequest);
      } else if (call.status === 'ringing' || call.status === 'initiating') {
        // Send CANCEL for ringing calls
        if (call.dialog && call.dialog.inviteRequest) {
          const cancelRequest: any = {
            method: 'CANCEL',
            uri: call.dialog.inviteRequest.uri,
            headers: {
              to: call.dialog.inviteRequest.headers.to,
              from: call.dialog.inviteRequest.headers.from,
              'call-id': callId,
              cseq: { method: 'CANCEL', seq: call.dialog.inviteRequest.headers.cseq.seq },
              via: call.dialog.inviteRequest.headers.via
            }
          };

          // Note: CANCEL is fire-and-forget
          sip.send(cancelRequest);
        }
      }
      
      call.status = 'ended';
      call.endTime = new Date();
      return true;
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to hangup:', error);
      return false;
    }
  }

  async sendDTMF(callId: string, digits: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call || !call.dialog || call.status !== 'answered') {
      console.warn(`[SIP_SERVICE] Call ${callId} not active for DTMF`);
      return false;
    }

    console.log(`[SIP_SERVICE] 🔢 Sending DTMF: ${digits}`);
    
    try {
      const contactUri = call.dialog.lastResponse.headers.contact?.[0]?.uri 
        || call.dialog.remote.uri;

      const infoRequest: any = {
        method: 'INFO',
        uri: contactUri,
        headers: {
          to: call.dialog.remote,
          from: call.dialog.local,
          'call-id': callId,
          cseq: { method: 'INFO', seq: call.dialog.cseq + 1 },
          'content-type': 'application/dtmf-relay',
          via: call.dialog.inviteRequest.headers.via
        },
        content: `Signal=${digits}\r\nDuration=100`
      };

      call.dialog.cseq++;
      // Note: INFO for DTMF is fire-and-forget
      sip.send(infoRequest);
      
      return true;
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to send DTMF:', error);
      return false;
    }
  }

  getCallStatus(callId: string): SIPCall | undefined {
    return this.activeCalls.get(callId);
  }

  getAllCalls(): SIPCall[] {
    return Array.from(this.activeCalls.values());
  }

  private handleIncomingMessage(message: any): void {
    // Handle responses (200 OK, 180 Ringing, 401/407 Auth, etc)
    if (message.status) {
      const callId = message.headers['call-id'];
      
      // Handle REGISTER responses
      if (message.headers.cseq?.method === 'REGISTER') {
        if (message.status === 401 || message.status === 407) {
          console.log(`[SIP_SERVICE] 🔐 Received ${message.status} auth challenge for REGISTER`);
          console.log('[SIP_SERVICE] Auth challenge headers:', JSON.stringify(message.headers['www-authenticate'], null, 2));
          
          try {
            // Store the challenge response for digest signing
            this.authChallengeResponse = message;
            
            digest.challenge(this.authSession, message);
            console.log('[SIP_SERVICE] ✅ Auth session populated successfully');
            console.log('[SIP_SERVICE] Auth session keys:', Object.keys(this.authSession));
            this.register(true);
          } catch (error) {
            console.error('[SIP_SERVICE] ❌ Error processing auth challenge:', error);
            if (this.registrationReject) {
              this.registrationReject(new Error(`Auth challenge failed: ${error}`));
              this.registrationResolve = null;
              this.registrationReject = null;
            }
          }
        } else if (message.status === 200) {
          console.log('[SIP_SERVICE] ✅ Registration successful!');
          this.registered = true;
          // Resolve registration promise
          if (this.registrationResolve) {
            this.registrationResolve();
            this.registrationResolve = null;
            this.registrationReject = null;
          }
        } else {
          console.error(`[SIP_SERVICE] ❌ Registration failed with status ${message.status}`);
          // Reject registration promise
          if (this.registrationReject) {
            this.registrationReject(new Error(`Registration failed with status ${message.status}`));
            this.registrationResolve = null;
            this.registrationReject = null;
          }
        }
        return;
      }

      // Handle INVITE responses
      const call = this.activeCalls.get(callId);
      if (!call) return;

      switch (message.status) {
        case 100:
          console.log(`[SIP_SERVICE] 📞 Call ${callId}: Trying...`);
          break;
        case 180:
        case 183:
          console.log(`[SIP_SERVICE] 📞 Call ${callId}: Ringing...`);
          call.status = 'ringing';
          break;
        case 200:
          if (message.headers.cseq.method === 'INVITE') {
            console.log(`[SIP_SERVICE] ✅ Call ${callId}: Answered!`);
            call.status = 'answered';
            // Store the 200 OK response for later use
            if (call.dialog) {
              call.dialog.lastResponse = message;
              // CRITICAL: remote is 'To' header (callee with their tag), not 'From' (us)
              call.dialog.remote = message.headers.to;
              call.dialog.local = message.headers.from;
            }
            
            // Parse SDP from response to get remote RTP address/port
            if (message.content) {
              const sdp = message.content.toString();
              const connectionMatch = sdp.match(/c=IN IP4 ([\d.]+)/);
              const audioMatch = sdp.match(/m=audio (\d+)/);
              
              if (connectionMatch && audioMatch) {
                const remoteAddress = connectionMatch[1];
                const remotePort = parseInt(audioMatch[1]);
                
                console.log(`[SIP_SERVICE] 🎵 Creating RTP session for call ${callId}`);
                console.log(`[SIP_SERVICE] 🎵 Remote RTP: ${remoteAddress}:${remotePort}`);
                console.log(`[SIP_SERVICE] 🎵 Local RTP: ${this.localIP}:10000`);
                
                // Create RTP session for audio (payload type 0 = PCMU)
                rtpService.createSession(callId, remoteAddress, remotePort, 0);
                
                // Start real-time voice conversion based on call configuration
                const voiceType = call.voiceType || 'masc';
                
                if (voiceType === 'none') {
                  console.log(`[SIP_SERVICE] 🎤 Using original voice (no conversion) for call ${callId}`);
                  // Do NOT start voice conversion - audio will pass through directly
                } else {
                  console.log(`[SIP_SERVICE] 🎙️ Starting voice conversion session with ${voiceType} voice`);
                  realtimeVoiceService.startRealtimeVoice(callId, voiceType as 'masc' | 'fem' | 'natural').then((success) => {
                    if (success) {
                      console.log(`[SIP_SERVICE] ✅ Voice conversion session started for ${callId}`);
                    } else {
                      console.error(`[SIP_SERVICE] ❌ Failed to start voice conversion for ${callId}`);
                    }
                  }).catch((error) => {
                    console.error(`[SIP_SERVICE] ❌ Error starting voice conversion for ${callId}:`, error);
                  });
                }
              } else {
                console.warn(`[SIP_SERVICE] ⚠️ Could not parse SDP for RTP setup`);
              }
            }
            
            // Send ACK
            this.sendAck(call, message);
          }
          break;
        case 401:
        case 407:
          if (message.headers.cseq.method === 'INVITE') {
            console.log(`[SIP_SERVICE] 🔐 Call ${callId}: Auth challenge for INVITE (${message.status})`);
            // Re-send INVITE with digest authentication
            this.reInviteWithAuth(call, message);
          }
          break;
        case 486:
          console.log(`[SIP_SERVICE] 📵 Call ${callId}: Busy`);
          call.status = 'ended';
          call.error = 'Busy';
          call.endTime = new Date();
          break;
        case 487:
          console.log(`[SIP_SERVICE] 📴 Call ${callId}: Cancelled`);
          call.status = 'ended';
          call.endTime = new Date();
          break;
        default:
          if (message.status >= 400) {
            console.log(`[SIP_SERVICE] ❌ Call ${callId}: Error ${message.status} - ${message.reason}`);
            call.status = 'failed';
            call.error = `${message.status} ${message.reason}`;
            call.endTime = new Date();
          }
      }
    }
  }

  private handleIncomingRequest(request: any): void {
    console.log(`[SIP_SERVICE] Incoming request: ${request.method}`);
    
    // Handle incoming calls, BYE, etc
    if (request.method === 'BYE') {
      const callId = request.headers['call-id'];
      const call = this.activeCalls.get(callId);
      
      if (call) {
        console.log(`[SIP_SERVICE] 📴 Remote party hung up call ${callId}`);
        call.status = 'ended';
        call.endTime = new Date();
        
        // Stop voice conversion
        realtimeVoiceService.stopRealtimeVoice(callId);
        
        // End RTP session
        rtpService.endSession(callId);
      }
      
      // Send 200 OK response to BYE
      sip.send({
        method: 'OK',
        status: 200,
        reason: 'OK',
        headers: request.headers
      });
    }
  }

  private sendAck(call: SIPCall, inviteResponse: any): void {
    try {
      // ACK must be sent to the Contact URI from the 200 OK, not the original Request-URI
      const contactUri = inviteResponse.headers.contact?.[0]?.uri 
        || inviteResponse.headers.from.uri;

      const ackRequest: any = {
        method: 'ACK',
        uri: contactUri,
        headers: {
          to: inviteResponse.headers.to,
          from: inviteResponse.headers.from,
          'call-id': call.callId,
          cseq: { method: 'ACK', seq: inviteResponse.headers.cseq.seq },
          via: call.dialog?.inviteRequest.headers.via || inviteResponse.headers.via
        }
      };
      
      // Note: ACK is fire-and-forget - no response expected
      sip.send(ackRequest);
      console.log('[SIP_SERVICE] ✅ ACK sent to', contactUri);
    } catch (error) {
      console.error('[SIP_SERVICE] ❌ Failed to send ACK:', error);
    }
  }

  private createSDP(): string {
    const sessionId = Date.now();
    const version = 1;
    
    // Use dynamic RTP port range for better compatibility
    const rtpPort = this.getAvailableRTPPort();
    
    return [
      `v=0`,
      `o=- ${sessionId} ${version} IN IP4 ${this.localIP}`,
      `s=Abmix Call`,
      `c=IN IP4 ${this.localIP}`,
      `t=0 0`,
      `m=audio ${rtpPort} RTP/AVP 0 8 101`,
      `a=rtpmap:0 PCMU/8000`,
      `a=rtpmap:8 PCMA/8000`, 
      `a=rtpmap:101 telephone-event/8000`,
      `a=fmtp:101 0-15`,
      `a=sendrecv`,
      `a=ptime:20`
    ].join('\r\n') + '\r\n';
  }

  /**
   * Get available RTP port for media
   */
  private getAvailableRTPPort(): number {
    // Use port range 10000-20000 for RTP (standard range)
    // For now, use fixed port but this should be dynamic in production
    return 10000;
  }

  async shutdown(): Promise<void> {
    console.log('[SIP_SERVICE] Shutting down...');
    
    // Hangup all active calls
    const callIds = Array.from(this.activeCalls.keys());
    for (const callId of callIds) {
      await this.hangup(callId);
    }
    
    sip.stop();
    this.initialized = false;
    this.registered = false;
    console.log('[SIP_SERVICE] ✅ Shutdown complete');
  }
}
