import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * MicrophoneCapture - Captura microfone e envia via WebSocket para RTP
 */
export function MicrophoneCapture() {
  const { callState, currentCallId } = useCallStore();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (callState === 'CONNECTED' && currentCallId) {
      startMicrophoneCapture();
    } else {
      stopMicrophoneCapture();
    }

    return () => {
      stopMicrophoneCapture();
    };
  }, [callState, currentCallId]);

  const startMicrophoneCapture = async () => {
    try {
      console.log('[MIC_CAPTURE] 🎤 Iniciando captura de microfone');

      // Feature-detect do microfone (CORREÇÃO OPENAI)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[MIC_CAPTURE] ❌ MediaDevices não disponível');
        console.error('[MIC_CAPTURE] 🔒 Use HTTPS ou ative permissões de microfone');
        return;
      }

      const inputDeviceId = localStorage.getItem('audioInputDevice') || undefined;

      // Capturar microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDeviceId ? { exact: inputDeviceId } as any : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 8000
        }
      });

      mediaStreamRef.current = stream;

      // Criar AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 8000
      });
      audioContextRef.current = audioContext;

      // Conectar WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/media`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MIC_CAPTURE] ✅ WebSocket conectado para envio de microfone');
      };

      // Processar áudio do microfone
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          
          // Converter Float32 para PCM16
          const pcm16Buffer = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            pcm16Buffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }

          // Enviar via WebSocket
          const uint8Array = new Uint8Array(pcm16Buffer.buffer);
          const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

          ws.send(JSON.stringify({
            event: 'microphone-audio',
            callId: currentCallId,
            audioData: base64Audio,
            sampleRate: 8000,
            format: 'pcm16'
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('[MIC_CAPTURE] ✅ Captura de microfone ativa');

    } catch (error) {
      console.error('[MIC_CAPTURE] ❌ Erro ao iniciar captura:', error);
    }
  };

  const stopMicrophoneCapture = () => {
    console.log('[MIC_CAPTURE] 🛑 Parando captura de microfone');

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return null; // Componente invisível
}
