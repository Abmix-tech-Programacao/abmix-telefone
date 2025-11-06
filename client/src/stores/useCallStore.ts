import { create } from 'zustand';
import { Transcript, Favorite } from '@shared/schema';

interface CallState {
  // Call management
  callState: 'IDLE' | 'RINGING' | 'CONNECTED' | 'ENDED';
  currentCallId: string | null;
  recordingSid: string | null;
  voiceType: 'masc' | 'fem' | 'natural' | 'none';
  aiActive: boolean;
  latency: number;
  micLevel: number;
  speakerLevel: number;
  phoneNumber: string;
  
  // Transcripts
  transcripts: Transcript[];
  
  // Favorites
  favorites: Favorite[];
  
  // UI states
  isRecording: boolean;
  livePrompt: string;
  selectedProvider: string;
  activeView: 'discagem' | 'vozes' | 'chamadas' | 'favoritos' | 'gravacoes' | 'configuracoes' | 'numeros';
  
  // Actions
  setCallState: (state: 'IDLE' | 'RINGING' | 'CONNECTED' | 'ENDED') => void;
  setCurrentCallId: (callId: string | null) => void;
  setRecordingSid: (sid: string | null) => void;
  setVoiceType: (type: 'masc' | 'fem' | 'natural' | 'none') => void;
  setAiActive: (active: boolean) => void;
  setLatency: (latency: number) => void;
  setMicLevel: (level: number) => void;
  setSpeakerLevel: (level: number) => void;
  setPhoneNumber: (number: string) => void;
  appendToPhoneNumber: (digit: string) => void;
  clearPhoneNumber: () => void;
  addTranscript: (transcript: Transcript) => void;
  updateTranscript: (id: string, updates: Partial<Transcript>) => void;
  clearTranscripts: () => void;
  setFavorites: (favorites: Favorite[]) => void;
  setIsRecording: (recording: boolean) => void;
  setLivePrompt: (prompt: string) => void;
  setSelectedProvider: (provider: string) => void;
  setActiveView: (view: 'discagem' | 'vozes' | 'chamadas' | 'favoritos' | 'gravacoes' | 'configuracoes' | 'numeros') => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  // Initial state
  callState: 'IDLE',
  currentCallId: null,
  recordingSid: null,
  voiceType: 'none',
  aiActive: false,
  latency: 0,
  micLevel: 0,
  speakerLevel: 0,
  phoneNumber: '',
  transcripts: [],
  favorites: [],
  isRecording: false,
  livePrompt: '',
  selectedProvider: 'falevono',
  activeView: 'discagem',
  
  // Actions
  setCallState: (state) => set({ callState: state }),
  setCurrentCallId: (callId) => set({ currentCallId: callId }),
  setRecordingSid: (sid) => set({ recordingSid: sid }),
  setVoiceType: (type) => set({ voiceType: type }),
  setAiActive: (active) => set({ aiActive: active }),
  setLatency: (latency) => set({ latency }),
  setMicLevel: (level) => set({ micLevel: level }),
  setSpeakerLevel: (level) => set({ speakerLevel: level }),
  setPhoneNumber: (number) => set({ phoneNumber: number }),
  appendToPhoneNumber: (digit) => set(state => ({ 
    phoneNumber: state.phoneNumber + digit 
  })),
  clearPhoneNumber: () => set({ phoneNumber: '' }),
  
  addTranscript: (transcript) => set(state => ({
    transcripts: [...state.transcripts, transcript]
  })),
  
  updateTranscript: (id, updates) => set(state => ({
    transcripts: state.transcripts.map(t => 
      t.id === id ? { ...t, ...updates } : t
    )
  })),
  
  clearTranscripts: () => set({ transcripts: [] }),
  setFavorites: (favorites) => set({ favorites }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setLivePrompt: (prompt) => set({ livePrompt: prompt }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setActiveView: (view) => set({ activeView: view }),
}));
