import OpenAI from 'openai';
import { EventEmitter } from 'events';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationContext {
  sessionId: string;
  callId: string;
  systemPrompt: string;
  temperature: number;
  messages: OpenAIMessage[];
  isActive: boolean;
  isPaused: boolean;
}

export class OpenAIService extends EventEmitter {
  private openai: OpenAI;
  private conversations: Map<string, ConversationContext>;

  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('[OPENAI] OPENAI_API_KEY not found in environment');
    }

    this.openai = new OpenAI({ apiKey });
    this.conversations = new Map();
    
    console.log('[OPENAI] Service initialized');
  }

  createConversation(callId: string, sessionId: string, systemPrompt: string, temperature = 0.7): ConversationContext {
    const context: ConversationContext = {
      sessionId,
      callId,
      systemPrompt,
      temperature: Math.min(Math.max(temperature, 0), 1),
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      isActive: true,
      isPaused: false,
    };

    this.conversations.set(callId, context);
    console.log(`[OPENAI] Conversation created for call ${callId}`);
    
    this.emit('conversation:created', { callId, sessionId });
    
    return context;
  }

  getConversation(callId: string): ConversationContext | undefined {
    return this.conversations.get(callId);
  }

  async chat(callId: string, userMessage: string): Promise<string> {
    const context = this.conversations.get(callId);
    
    if (!context) {
      throw new Error(`[OPENAI] No conversation found for call ${callId}`);
    }

    if (!context.isActive) {
      console.warn(`[OPENAI] Conversation for call ${callId} is not active`);
      return '';
    }

    if (context.isPaused) {
      console.warn(`[OPENAI] Conversation for call ${callId} is paused`);
      return '';
    }

    context.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: context.messages,
        temperature: context.temperature,
        max_tokens: 500,
        stream: false,
      });

      const assistantMessage = completion.choices[0]?.message?.content || '';
      
      if (assistantMessage) {
        context.messages.push({
          role: 'assistant',
          content: assistantMessage,
        });

        this.emit('message:sent', {
          callId,
          role: 'assistant',
          content: assistantMessage,
        });
      }

      return assistantMessage;
    } catch (error) {
      console.error('[OPENAI] Chat error:', error);
      this.emit('error', { callId, error });
      throw error;
    }
  }

  async streamChat(callId: string, userMessage: string): Promise<AsyncIterable<string>> {
    const context = this.conversations.get(callId);
    
    if (!context) {
      throw new Error(`[OPENAI] No conversation found for call ${callId}`);
    }

    if (!context.isActive || context.isPaused) {
      return this.emptyStream();
    }

    context.messages.push({
      role: 'user',
      content: userMessage,
    });

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: context.messages,
      temperature: context.temperature,
      max_tokens: 500,
      stream: true,
    });

    let fullResponse = '';

    async function* generateTokens() {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }
    }

    const tokens = generateTokens();

    const self = this;
    (async () => {
      for await (const token of tokens) {
        continue;
      }
      
      if (fullResponse) {
        context.messages.push({
          role: 'assistant',
          content: fullResponse,
        });

        self.emit('message:sent', {
          callId,
          role: 'assistant',
          content: fullResponse,
        });
      }
    })();

    return tokens;
  }

  private async *emptyStream(): AsyncIterable<string> {
    return;
  }

  updateSystemPrompt(callId: string, newPrompt: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      console.warn(`[OPENAI] No conversation found for call ${callId}`);
      return false;
    }

    context.systemPrompt = newPrompt;
    
    const systemMessageIndex = context.messages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      context.messages[systemMessageIndex].content = newPrompt;
    } else {
      context.messages.unshift({ role: 'system', content: newPrompt });
    }

    console.log(`[OPENAI] System prompt updated for call ${callId}`);
    this.emit('prompt:updated', { callId, prompt: newPrompt });
    
    return true;
  }

  enableConversation(callId: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    context.isActive = true;
    console.log(`[OPENAI] Conversation enabled for call ${callId}`);
    this.emit('conversation:enabled', { callId });
    
    return true;
  }

  disableConversation(callId: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    context.isActive = false;
    console.log(`[OPENAI] Conversation disabled for call ${callId}`);
    this.emit('conversation:disabled', { callId });
    
    return true;
  }

  pauseSpeech(callId: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    context.isPaused = true;
    console.log(`[OPENAI] Speech paused for call ${callId}`);
    this.emit('speech:paused', { callId });
    
    return true;
  }

  resumeSpeech(callId: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    context.isPaused = false;
    console.log(`[OPENAI] Speech resumed for call ${callId}`);
    this.emit('speech:resumed', { callId });
    
    return true;
  }

  endConversation(callId: string): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    context.isActive = false;
    this.conversations.delete(callId);
    
    console.log(`[OPENAI] Conversation ended for call ${callId}`);
    this.emit('conversation:ended', { callId });
    
    return true;
  }

  getMessageHistory(callId: string): OpenAIMessage[] {
    const context = this.conversations.get(callId);
    return context ? [...context.messages] : [];
  }

  clearHistory(callId: string, keepSystemPrompt = true): boolean {
    const context = this.conversations.get(callId);
    
    if (!context) {
      return false;
    }

    if (keepSystemPrompt) {
      context.messages = context.messages.filter(m => m.role === 'system');
    } else {
      context.messages = [];
    }

    console.log(`[OPENAI] History cleared for call ${callId}`);
    return true;
  }

  getActiveConversations(): string[] {
    return Array.from(this.conversations.entries())
      .filter(([_, context]) => context.isActive)
      .map(([callId, _]) => callId);
  }

  getAllConversations(): Map<string, ConversationContext> {
    return new Map(this.conversations);
  }
}

export const openaiService = new OpenAIService();
