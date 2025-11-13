import { apiRequest } from '@/lib/queryClient';

export const api = {
  // === TELEPHONY ENDPOINTS ===
  
  startCall: async (provider: string, toNumber: string, voiceType: string = 'masc', fromNumberId?: string) => {
    const response = await apiRequest('POST', '/api/call/dial', {
      to: toNumber,
      voiceType,
      from_number_id: fromNumberId,
    });
    return response.json();
  },

  hangupCall: async (callSid: string) => {
    const response = await apiRequest('POST', '/api/call/hangup', { callSid });
    return response.json();
  },

  sendDTMF: async (callSid: string, digits: string) => {
    const response = await apiRequest('POST', '/api/call/dtmf', { callSid, digits });
    return response.json();
  },

  answerCall: async (callSid: string) => {
    const response = await apiRequest('POST', '/api/call/answer', { callSid });
    return response.json();
  },

  // === RECORDING ENDPOINTS ===
  
  startRecording: async (callSid: string, phoneNumber?: string) => {
    const response = await apiRequest('POST', '/api/recordings/start', { 
      callSid,
      phoneNumber: phoneNumber || 'Unknown'
    });
    return response.json();
  },

  pauseRecording: async (recordingId: number) => {
    const response = await apiRequest('POST', `/api/recordings/${recordingId}/pause`);
    return response.json();
  },

  resumeRecording: async (recordingId: number) => {
    const response = await apiRequest('POST', `/api/recordings/${recordingId}/resume`);
    return response.json();
  },

  stopRecording: async (recordingId: number) => {
    const response = await apiRequest('POST', `/api/recordings/${recordingId}/stop`);
    return response.json();
  },

  getRecordings: async () => {
    const response = await apiRequest('GET', '/api/recordings/list');
    return response.json();
  },

  downloadRecording: async (id: string) => {
    const response = await fetch(`/api/recordings/${id}/download`);
    return response.blob();
  },

  deleteRecording: async (id: string) => {
    const response = await apiRequest('DELETE', `/api/recordings/${id}`);
    return response.json();
  },

  // === AI/AGENT ENDPOINTS ===
  
  injectPrompt: async (callSid: string, text: string) => {
    const response = await apiRequest('POST', '/api/agent/prompt', { text, callSid });
    return response.json();
  },

  pauseAI: async (callSid: string) => {
    const response = await apiRequest('POST', '/api/agent/disable', { callSid });
    return response.json();
  },

  resumeAI: async (callSid: string) => {
    const response = await apiRequest('POST', '/api/agent/enable', { callSid });
    return response.json();
  },

  // === VOICE/TTS ENDPOINTS ===
  
  getVoices: async () => {
    const response = await apiRequest('GET', '/api/voices');
    return response.json();
  },

  testVoice: async (voiceId: string, text: string = "Olá, esta é uma demonstração da voz.") => {
    const response = await fetch('/api/voice/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId, text })
    });
    return response;
  },

  // Preview voice (returns audio blob)
  previewVoice: async (voiceId: string, text: string = "Olá, esta é uma demonstração da voz.") => {
    const response = await fetch('/api/voice/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId, text })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate voice preview');
    }
    
    return response.blob();
  },

  // === FAVORITES ENDPOINTS ===
  
  getFavorites: async () => {
    const response = await apiRequest('GET', '/api/favorites');
    return response.json();
  },

  addFavorite: async (favorite: { name: string; phone_e164: string; voice_type?: 'masc' | 'fem' }) => {
    const response = await apiRequest('POST', '/api/favorites/add', favorite);
    return response.json();
  },

  removeFavorite: async (id: string) => {
    const response = await apiRequest('DELETE', `/api/favorites/${id}`);
    return response.json();
  },

  // === SETTINGS ENDPOINTS ===
  
  getSettings: async () => {
    const response = await apiRequest('GET', '/api/settings');
    return response.json();
  },

  updateSettings: async (settings: Record<string, string>) => {
    const response = await apiRequest('POST', '/api/settings', settings);
    return response.json();
  },

  // === TRANSCRIPTS ENDPOINTS ===
  
  getTranscripts: async (callId: string) => {
    const response = await apiRequest('GET', `/api/transcripts/${callId}`);
    return response.json();
  },

  // === VOIP NUMBERS ENDPOINTS ===
  
  getVoipNumbers: async () => {
    const response = await apiRequest('GET', '/api/voip-numbers');
    return response.json();
  },

  getActiveVoipNumbers: async () => {
    const response = await apiRequest('GET', '/api/voip-numbers/active');
    return response.json();
  },

  addVoipNumber: async (numberData: {
    number: string;
    provider: string;
    name: string;
    account_id?: string;
    password?: string;
    server?: string;
    is_active?: boolean;
  }) => {
    const response = await apiRequest('POST', '/api/voip-numbers', numberData);
    return response.json();
  },

  updateVoipNumber: async (id: string, numberData: {
    number: string;
    provider: string;
    name: string;
    account_id?: string;
    password?: string;
    server?: string;
    is_active?: boolean;
  }) => {
    const response = await apiRequest('PUT', `/api/voip-numbers/${id}`, numberData);
    return response.json();
  },

  deleteVoipNumber: async (id: string) => {
    const response = await apiRequest('DELETE', `/api/voip-numbers/${id}`);
    return response.json();
  },

  toggleVoipNumber: async (id: string) => {
    const response = await apiRequest('POST', `/api/voip-numbers/${id}/toggle`);
    return response.json();
  },

  testVoipNumber: async (id: string) => {
    const response = await apiRequest('POST', `/api/voip-numbers/${id}/test`);
    return response.json();
  },

  testVoipCredentials: async (numberData: {
    number: string;
    provider: string;
    name: string;
    account_id?: string;
    password?: string;
    server?: string;
  }) => {
    const response = await apiRequest('POST', '/api/voip-numbers/test-credentials', numberData);
    return response.json();
  },

  // === LEGACY COMPATIBILITY ===
  
  sendLivePrompt: async (text: string, style?: string) => {
    const response = await apiRequest('POST', '/api/agent/prompt', { text, style });
    return response.json();
  },
};