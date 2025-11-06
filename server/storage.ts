import { 
  type Favorite, type InsertFavorite, 
  type Call, type InsertCall, 
  type Transcript, type InsertTranscript, 
  type Prompt, type InsertPrompt,
  type AgentSession, type InsertAgentSession,
  type AgentMessage, type InsertAgentMessage,
  type EffectPreset, type InsertEffectPreset,
  type CodecPreference, type InsertCodecPreference
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Favorites
  getFavorites(): Promise<Favorite[]>;
  getFavorite(id: string): Promise<Favorite | undefined>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  updateFavorite(id: string, favorite: Partial<InsertFavorite>): Promise<Favorite | undefined>;
  deleteFavorite(id: string): Promise<boolean>;

  // Calls
  getCalls(): Promise<Call[]>;
  getCall(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, call: Partial<Call>): Promise<Call | undefined>;

  // Transcripts
  getTranscripts(callId: string): Promise<Transcript[]>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;

  // Prompts
  getPrompts(callId: string): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<Prompt>): Promise<Prompt | undefined>;

  // Agent Sessions
  getAgentSession(callId: string): Promise<AgentSession | undefined>;
  createAgentSession(session: InsertAgentSession): Promise<AgentSession>;
  updateAgentSession(id: string, session: Partial<AgentSession>): Promise<AgentSession | undefined>;

  // Agent Messages
  getAgentMessages(sessionId: string): Promise<AgentMessage[]>;
  createAgentMessage(message: InsertAgentMessage): Promise<AgentMessage>;

  // Effect Presets
  getEffectPresets(): Promise<EffectPreset[]>;
  getEffectPreset(id: string): Promise<EffectPreset | undefined>;
  getDefaultEffectPreset(): Promise<EffectPreset | undefined>;
  createEffectPreset(preset: InsertEffectPreset): Promise<EffectPreset>;
  updateEffectPreset(id: string, preset: Partial<EffectPreset>): Promise<EffectPreset | undefined>;
  deleteEffectPreset(id: string): Promise<boolean>;

  // Codec Preferences
  getCodecPreference(voipNumberId: number): Promise<CodecPreference | undefined>;
  createCodecPreference(preference: InsertCodecPreference): Promise<CodecPreference>;
  updateCodecPreference(id: string, preference: Partial<CodecPreference>): Promise<CodecPreference | undefined>;
}

export class MemStorage implements IStorage {
  private favorites: Map<string, Favorite>;
  private calls: Map<string, Call>;
  private transcripts: Map<string, Transcript>;
  private prompts: Map<string, Prompt>;
  private agentSessions: Map<string, AgentSession>;
  private agentMessages: Map<string, AgentMessage>;
  private effectPresets: Map<string, EffectPreset>;
  private codecPreferences: Map<string, CodecPreference>;

  constructor() {
    this.favorites = new Map();
    this.calls = new Map();
    this.transcripts = new Map();
    this.prompts = new Map();
    this.agentSessions = new Map();
    this.agentMessages = new Map();
    this.effectPresets = new Map();
    this.codecPreferences = new Map();
    
    this.initializeDefaults();
  }

  private initializeDefaults() {
    const defaultPreset: EffectPreset = {
      id: randomUUID(),
      name: 'Default',
      description: 'Default audio processing preset',
      noiseReduction: true,
      noiseReductionLevel: 50,
      equalization: false,
      eqPreset: null,
      amplification: false,
      amplificationGain: 0,
      normalization: true,
      normalizationTarget: -3,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.effectPresets.set(defaultPreset.id, defaultPreset);
  }

  // Favorites
  async getFavorites(): Promise<Favorite[]> {
    return Array.from(this.favorites.values());
  }

  async getFavorite(id: string): Promise<Favorite | undefined> {
    return this.favorites.get(id);
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = randomUUID();
    const favorite: Favorite = {
      id,
      name: insertFavorite.name,
      phoneE164: insertFavorite.phoneE164,
      voiceType: insertFavorite.voiceType || 'masc',
      createdAt: new Date(),
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async updateFavorite(id: string, updateData: Partial<InsertFavorite>): Promise<Favorite | undefined> {
    const existing = this.favorites.get(id);
    if (!existing) return undefined;

    const updated: Favorite = { ...existing, ...updateData };
    this.favorites.set(id, updated);
    return updated;
  }

  async deleteFavorite(id: string): Promise<boolean> {
    return this.favorites.delete(id);
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return Array.from(this.calls.values());
  }

  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = {
      ...insertCall,
      id,
      startTime: new Date(),
      endTime: null,
      duration: null,
      recordingUrl: null,
      recordingStatus: null,
      metadata: null,
      fromNumber: insertCall.fromNumber || null,
      twilioSid: insertCall.twilioSid || null,
    };
    this.calls.set(id, call);
    return call;
  }

  async updateCall(id: string, updateData: Partial<Call>): Promise<Call | undefined> {
    const existing = this.calls.get(id);
    if (!existing) return undefined;

    const updated: Call = { ...existing, ...updateData };
    this.calls.set(id, updated);
    return updated;
  }

  // Transcripts
  async getTranscripts(callId: string): Promise<Transcript[]> {
    return Array.from(this.transcripts.values()).filter(t => t.callId === callId);
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = randomUUID();
    const transcript: Transcript = {
      ...insertTranscript,
      id,
      timestamp: new Date(),
      callId: insertTranscript.callId || null,
      isFinal: insertTranscript.isFinal || null,
      confidence: insertTranscript.confidence || null,
    };
    this.transcripts.set(id, transcript);
    return transcript;
  }

  // Prompts
  async getPrompts(callId: string): Promise<Prompt[]> {
    return Array.from(this.prompts.values()).filter(p => p.callId === callId);
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = randomUUID();
    const prompt: Prompt = {
      ...insertPrompt,
      id,
      timestamp: new Date(),
      applied: false,
      callId: insertPrompt.callId || null,
    };
    this.prompts.set(id, prompt);
    return prompt;
  }

  async updatePrompt(id: string, updateData: Partial<Prompt>): Promise<Prompt | undefined> {
    const existing = this.prompts.get(id);
    if (!existing) return undefined;

    const updated: Prompt = { ...existing, ...updateData };
    this.prompts.set(id, updated);
    return updated;
  }

  // Agent Sessions
  async getAgentSession(callId: string): Promise<AgentSession | undefined> {
    return Array.from(this.agentSessions.values()).find(s => s.callId === callId);
  }

  async createAgentSession(insertSession: InsertAgentSession): Promise<AgentSession> {
    const id = randomUUID();
    const session: AgentSession = {
      id,
      callId: insertSession.callId,
      systemPrompt: insertSession.systemPrompt,
      temperature: insertSession.temperature ?? null,
      isActive: insertSession.isActive ?? null,
      isPaused: insertSession.isPaused ?? null,
      startedAt: new Date(),
      endedAt: null,
      metadata: insertSession.metadata ?? null,
    };
    this.agentSessions.set(id, session);
    return session;
  }

  async updateAgentSession(id: string, updateData: Partial<AgentSession>): Promise<AgentSession | undefined> {
    const existing = this.agentSessions.get(id);
    if (!existing) return undefined;

    const updated: AgentSession = { ...existing, ...updateData };
    this.agentSessions.set(id, updated);
    return updated;
  }

  // Agent Messages
  async getAgentMessages(sessionId: string): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values()).filter(m => m.sessionId === sessionId);
  }

  async createAgentMessage(insertMessage: InsertAgentMessage): Promise<AgentMessage> {
    const id = randomUUID();
    const message: AgentMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      metadata: insertMessage.metadata || null,
    };
    this.agentMessages.set(id, message);
    return message;
  }

  // Effect Presets
  async getEffectPresets(): Promise<EffectPreset[]> {
    return Array.from(this.effectPresets.values());
  }

  async getEffectPreset(id: string): Promise<EffectPreset | undefined> {
    return this.effectPresets.get(id);
  }

  async getDefaultEffectPreset(): Promise<EffectPreset | undefined> {
    return Array.from(this.effectPresets.values()).find(p => p.isDefault);
  }

  async createEffectPreset(insertPreset: InsertEffectPreset): Promise<EffectPreset> {
    const id = randomUUID();
    const preset: EffectPreset = {
      id,
      name: insertPreset.name,
      description: insertPreset.description ?? null,
      noiseReduction: insertPreset.noiseReduction ?? null,
      noiseReductionLevel: insertPreset.noiseReductionLevel ?? null,
      equalization: insertPreset.equalization ?? null,
      eqPreset: insertPreset.eqPreset ?? null,
      amplification: insertPreset.amplification ?? null,
      amplificationGain: insertPreset.amplificationGain ?? null,
      normalization: insertPreset.normalization ?? null,
      normalizationTarget: insertPreset.normalizationTarget ?? null,
      isDefault: insertPreset.isDefault ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.effectPresets.set(id, preset);
    return preset;
  }

  async updateEffectPreset(id: string, updateData: Partial<EffectPreset>): Promise<EffectPreset | undefined> {
    const existing = this.effectPresets.get(id);
    if (!existing) return undefined;

    const updated: EffectPreset = { ...existing, ...updateData, updatedAt: new Date() };
    this.effectPresets.set(id, updated);
    return updated;
  }

  async deleteEffectPreset(id: string): Promise<boolean> {
    return this.effectPresets.delete(id);
  }

  // Codec Preferences
  async getCodecPreference(voipNumberId: number): Promise<CodecPreference | undefined> {
    return Array.from(this.codecPreferences.values()).find(c => c.voipNumberId === voipNumberId);
  }

  async createCodecPreference(insertPreference: InsertCodecPreference): Promise<CodecPreference> {
    const id = randomUUID();
    const preference: CodecPreference = {
      id,
      voipNumberId: insertPreference.voipNumberId ?? null,
      codecOrder: insertPreference.codecOrder,
      preferredCodec: insertPreference.preferredCodec ?? 'opus',
      fallbackCodec: insertPreference.fallbackCodec ?? 'pcmu',
      allowG711: insertPreference.allowG711 ?? null,
      allowOpus: insertPreference.allowOpus ?? null,
      opusBitrate: insertPreference.opusBitrate ?? null,
      updatedAt: new Date(),
    };
    this.codecPreferences.set(id, preference);
    return preference;
  }

  async updateCodecPreference(id: string, updateData: Partial<CodecPreference>): Promise<CodecPreference | undefined> {
    const existing = this.codecPreferences.get(id);
    if (!existing) return undefined;

    const updated: CodecPreference = { ...existing, ...updateData, updatedAt: new Date() };
    this.codecPreferences.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
