import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * AudioPlayer - Reproduz áudio RTP via WebSocket
 */
export function AudioPlayer() {
  const { callState, currentCallId } = useCallStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (callState === 'CONNECTED' && currentCallId) {
      connectAudioStream();
    } else {
      disconnectAudioStream();
    }

    return () => {
      disconnectAudioStream();
    };
  }, [callState, currentCallId]);

  const connectAudioStream = async () => {
    try {
      console.log('[AUDIO_PLAYER] 🔊 Conectando stream de áudio para call:', currentCallId);

      // Criar AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 8000
        });
      }

      const audioContext = audioContextRef.current;

      // Ativar AudioContext
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Conectar WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/media`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AUDIO_PLAYER] ✅ WebSocket conectado para reprodução');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'rtp-audio' && data.callId === currentCallId) {
            console.log(`[AUDIO_PLAYER] 🎵 Reproduzindo áudio para call ${data.callId}`);
            
            // Converter base64 para AudioBuffer
            const audioBase64 = data.audioData;
            const audioBytes = atob(audioBase64);
            const audioArray = new Int16Array(audioBytes.length / 2);
            
            // Decodificar little-endian
            for (let i = 0; i < audioArray.length; i++) {
              const byte1 = audioBytes.charCodeAt(i * 2);
              const byte2 = audioBytes.charCodeAt(i * 2 + 1);
              audioArray[i] = (byte2 << 8) | byte1;
            }

            // Criar AudioBuffer
            const audioBuffer = audioContext.createBuffer(1, audioArray.length, 8000);
            const channelData = audioBuffer.getChannelData(0);
            
            // Converter para Float32
            for (let i = 0; i < audioArray.length; i++) {
              channelData[i] = audioArray[i] / 32768.0;
            }

            // Reproduzir
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Usar dispositivo de saída selecionado (se suportado)
            const savedOutputDevice = localStorage.getItem('audioOutputDevice');
            if (savedOutputDevice && (audioContext as any).setSinkId) {
              try {
                await (audioContext as any).setSinkId(savedOutputDevice);
              } catch (error) {
                console.warn('[AUDIO_PLAYER] Dispositivo de saída não suportado:', error);
              }
            }
            
            source.connect(audioContext.destination);
            source.start();
          }
        } catch (error) {
          console.error('[AUDIO_PLAYER] ❌ Erro ao reproduzir áudio:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[AUDIO_PLAYER] ❌ Erro WebSocket:', error);
      };

    } catch (error) {
      console.error('[AUDIO_PLAYER] ❌ Erro ao conectar stream:', error);
    }
  };

  const disconnectAudioStream = () => {
    console.log('[AUDIO_PLAYER] 🛑 Desconectando stream de áudio');

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  return null; // Componente invisível
}
