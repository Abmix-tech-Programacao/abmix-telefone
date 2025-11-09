import { EventEmitter } from 'events';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIProvider extends EventEmitter {
  private apiKey: string;
  private conversations = new Map<string, OpenAIMessage[]>();
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
  }

  // Initialize conversation for a call
  initializeConversation(callId: string, systemPrompt?: string): void {
    const defaultPrompt = `Você é um assistente de voz brasileiro profissional e simpático. 
    Responda de forma natural, concisa e útil. 
    Mantenha as respostas curtas para conversas por telefone.
    Use um tom amigável e profissional.`;

    this.conversations.set(callId, [
      {
        role: 'system',
        content: systemPrompt || defaultPrompt
      }
    ]);

    console.log(`[OPENAI] Conversation initialized for call ${callId}`);
  }

  // Process user speech and get AI response
  async processMessage(callId: string, userMessage: string): Promise<string> {
    try {
      let conversation = this.conversations.get(callId);
      
      if (!conversation) {
        // Initialize conversation if not exists
        this.initializeConversation(callId);
        conversation = this.conversations.get(callId)!;
      }

      // Add user message
      conversation.push({
        role: 'user',
        content: userMessage
      });

      console.log(`[OPENAI] Processing message for call ${callId}: "${userMessage}"`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cost-effective
          messages: conversation,
          max_tokens: 150, // Keep responses short for phone calls
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

      // Add AI response to conversation
      conversation.push({
        role: 'assistant',
        content: aiResponse
      });

      // Keep conversation history manageable (last 20 messages)
      if (conversation.length > 21) {
        // Keep system message + last 20 messages
        conversation.splice(1, conversation.length - 21);
      }

      this.conversations.set(callId, conversation);

      console.log(`[OPENAI] AI response for call ${callId}: "${aiResponse}"`);
      
      // Emit response for logging/monitoring
      this.emit('response', { callId, userMessage, aiResponse });

      return aiResponse;

    } catch (error) {
      console.error(`[OPENAI] Error processing message for call ${callId}:`, error);
      return 'Desculpe, houve um problema técnico. Pode repetir?';
    }
  }

  // Update system prompt during call
  updateSystemPrompt(callId: string, newPrompt: string): boolean {
    const conversation = this.conversations.get(callId);
    
    if (!conversation) {
      console.warn(`[OPENAI] No conversation found for call ${callId}`);
      return false;
    }

    // Update system message (first message)
    conversation[0] = {
      role: 'system',
      content: newPrompt
    };

    this.conversations.set(callId, conversation);
    console.log(`[OPENAI] System prompt updated for call ${callId}`);
    
    return true;
  }

  // End conversation and cleanup
  endConversation(callId: string): void {
    this.conversations.delete(callId);
    console.log(`[OPENAI] Conversation ended for call ${callId}`);
  }

  // Get conversation history
  getConversation(callId: string): OpenAIMessage[] | null {
    return this.conversations.get(callId) || null;
  }

  // Get active conversations count
  getActiveConversationsCount(): number {
    return this.conversations.size;
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[OPENAI] Connection test failed:', error);
      return false;
    }
  }
}

export const openaiProvider = new OpenAIProvider();
