import { EventEmitter } from 'events';
import { openaiService } from './openaiService';
import { storage } from './storage';

export interface AgentConfig {
  callId: string;
  systemPrompt: string;
  temperature?: number;
  autoStart?: boolean;
}

export class AgentOrchestrator extends EventEmitter {
  private activeSessions: Map<string, string>;

  constructor() {
    super();
    this.activeSessions = new Map();
    
    this.setupOpenAIListeners();
    
    console.log('[AGENT_ORCHESTRATOR] Initialized');
  }

  private setupOpenAIListeners() {
    openaiService.on('message:sent', async (data) => {
      const { callId, role, content } = data;
      
      try {
        const session = await storage.getAgentSession(callId);
        if (session) {
          await storage.createAgentMessage({
            sessionId: session.id,
            role,
            content,
            metadata: null,
          });

          this.emit('ai:response', {
            callId,
            text: content,
            sessionId: session.id,
          });
        }
      } catch (error) {
        console.error('[AGENT_ORCHESTRATOR] Error saving AI message:', error);
      }
    });

    openaiService.on('conversation:created', (data) => {
      this.emit('session:created', data);
    });

    openaiService.on('conversation:enabled', (data) => {
      this.emit('session:enabled', data);
    });

    openaiService.on('conversation:disabled', (data) => {
      this.emit('session:disabled', data);
    });

    openaiService.on('speech:paused', (data) => {
      this.emit('speech:paused', data);
    });

    openaiService.on('speech:resumed', (data) => {
      this.emit('speech:resumed', data);
    });
  }

  async startAgent(config: AgentConfig): Promise<string> {
    const { callId, systemPrompt, temperature = 0.7, autoStart = true } = config;

    const session = await storage.createAgentSession({
      callId,
      systemPrompt,
      temperature: Math.floor(temperature * 100),
      isActive: autoStart,
      isPaused: false,
      metadata: null,
    });

    const conversation = openaiService.createConversation(
      callId,
      session.id,
      systemPrompt,
      temperature
    );

    this.activeSessions.set(callId, session.id);

    console.log(`[AGENT_ORCHESTRATOR] Agent started for call ${callId}, session ${session.id}`);

    await storage.createAgentMessage({
      sessionId: session.id,
      role: 'system',
      content: systemPrompt,
      metadata: null,
    });

    return session.id;
  }

  async processUserInput(callId: string, userText: string): Promise<string> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      console.warn(`[AGENT_ORCHESTRATOR] No active session for call ${callId}`);
      return '';
    }

    const session = await storage.getAgentSession(callId);
    if (!session || !session.isActive) {
      console.warn(`[AGENT_ORCHESTRATOR] Session not active for call ${callId}`);
      return '';
    }

    try {
      await storage.createAgentMessage({
        sessionId,
        role: 'user',
        content: userText,
        metadata: null,
      });

      const aiResponse = await openaiService.chat(callId, userText);

      return aiResponse;
    } catch (error) {
      console.error('[AGENT_ORCHESTRATOR] Error processing user input:', error);
      this.emit('error', { callId, error });
      return '';
    }
  }

  async updatePrompt(callId: string, newPrompt: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.updateSystemPrompt(callId, newPrompt);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        systemPrompt: newPrompt,
      });

      await storage.createPrompt({
        callId,
        prompt: newPrompt,
        applied: true,
      });

      console.log(`[AGENT_ORCHESTRATOR] Prompt updated for call ${callId}`);
    }

    return success;
  }

  async enableAgent(callId: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.enableConversation(callId);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        isActive: true,
      });
    }

    return success;
  }

  async disableAgent(callId: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.disableConversation(callId);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        isActive: false,
      });
    }

    return success;
  }

  async pauseSpeech(callId: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.pauseSpeech(callId);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        isPaused: true,
      });
    }

    return success;
  }

  async resumeSpeech(callId: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.resumeSpeech(callId);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        isPaused: false,
      });
    }

    return success;
  }

  async endAgent(callId: string): Promise<boolean> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return false;
    }

    const success = openaiService.endConversation(callId);
    
    if (success) {
      await storage.updateAgentSession(sessionId, {
        isActive: false,
        endedAt: new Date(),
      });

      this.activeSessions.delete(callId);
      console.log(`[AGENT_ORCHESTRATOR] Agent ended for call ${callId}`);
    }

    return success;
  }

  getActiveSessionId(callId: string): string | undefined {
    return this.activeSessions.get(callId);
  }

  async getConversationHistory(callId: string): Promise<any[]> {
    const sessionId = this.activeSessions.get(callId);
    
    if (!sessionId) {
      return [];
    }

    const messages = await storage.getAgentMessages(sessionId);
    return messages;
  }

  isAgentActive(callId: string): boolean {
    const conversation = openaiService.getConversation(callId);
    return conversation ? conversation.isActive : false;
  }

  isAgentPaused(callId: string): boolean {
    const conversation = openaiService.getConversation(callId);
    return conversation ? conversation.isPaused : false;
  }

  getActiveCalls(): string[] {
    return openaiService.getActiveConversations();
  }
}

export const agentOrchestrator = new AgentOrchestrator();
