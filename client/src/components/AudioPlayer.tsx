import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * AudioPlayer - Reproduz áudio RTP recebido via WebSocket
 */
export function AudioPlayer() {
  const { callState, currentCallId } = useCallStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  useEffect(() => {
    // Conectar já em RINGING para que a mídia abra e possamos parar o ringtone na hora certa
    if ((callState === 'RINGING' || callState === 'CONNECTED') && currentCallId) {
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
      console.log('[AUDIO_PLAYER] 🔊 Conectando para reproduzir áudio RTP');

      // Feature-detect AudioContext (CORREÇÃO OPENAI)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.error('[AUDIO_PLAYER] ❌ AudioContext não disponível no navegador');
        return;
      }

      // Criar AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass({
          sampleRate: 8000
        });
      }

      const audioContext = audioContextRef.current;

      // Ativar AudioContext (autoplay policy): tenta e, se ficar suspenso, reativa no primeiro gesto do usuário
      const resumeAudioContext = async () => {
        try {
          if (audioContext.state !== 'running') {
            await audioContext.resume();
          }
        } catch {}
      };
      await resumeAudioContext();
      if (audioContext.state !== 'running') {
        const onUserInteract = async () => {
          await resumeAudioContext();
          document.removeEventListener('click', onUserInteract);
          document.removeEventListener('touchstart', onUserInteract);
        };
        document.addEventListener('click', onUserInteract, { once: true });
        document.addEventListener('touchstart', onUserInteract, { once: true });
      }

      // Conectar WebSocket para receber áudio RTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/media`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AUDIO_PLAYER] ✅ WebSocket conectado para receber áudio RTP');
        (window as any).__mediaOpen = true;

        // Preparar saída com <audio> oculto + MediaStreamDestination (melhor suporte a setSinkId)
        if (!destNodeRef.current) {
          destNodeRef.current = audioContext.createMediaStreamDestination();
        }
        if (!audioElRef.current) {
          const el = document.createElement('audio');
          el.style.display = 'none';
          el.autoplay = true;
          el.playsInline = true;
          audioElRef.current = el;
          document.body.appendChild(el);
        }
        if (audioElRef.current) {
          audioElRef.current.srcObject = destNodeRef.current!.stream;
        }

        // Aplicar dispositivo de saída salvo, quando suportado
        const outputDeviceId = localStorage.getItem('audioOutputDevice') || '';
        if (outputDeviceId && (audioElRef.current as any)?.setSinkId) {
          (audioElRef.current as any).setSinkId(outputDeviceId).then(() => {
            console.log('[AUDIO_PLAYER] Saída aplicada via setSinkId:', outputDeviceId);
          }).catch((e: any) => {
            console.warn('[AUDIO_PLAYER] setSinkId falhou/não suportado:', e);
          });
        }
      };

      ws.onclose = () => {
        (window as any).__mediaOpen = false;
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'rtp-audio' && data.callId === currentCallId) {
            console.log(`[AUDIO_PLAYER] 🎵 Reproduzindo áudio RTP para call ${data.callId}`);
            
            // Converter base64 para AudioBuffer
            const audioBase64 = data.audioData;
            const audioBytes = atob(audioBase64);
            const audioArray = new Int16Array(audioBytes.length / 2);
            
            // Decodificar PCM16 little-endian
            for (let i = 0; i < audioArray.length; i++) {
              const byte1 = audioBytes.charCodeAt(i * 2);
              const byte2 = audioBytes.charCodeAt(i * 2 + 1);
              audioArray[i] = (byte2 << 8) | byte1;
            }

            // Criar AudioBuffer
            const audioBuffer = audioContext.createBuffer(1, audioArray.length, 8000);
            const channelData = audioBuffer.getChannelData(0);
            
            // Converter Int16 para Float32
            for (let i = 0; i < audioArray.length; i++) {
              channelData[i] = audioArray[i] / 32768.0;
            }

            // Reproduzir áudio nos autofalantes
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;

          // Se houver destino para <audio>, use-o; caso contrário, destination padrão
          if (destNodeRef.current) {
            source.connect(destNodeRef.current);
          } else {
            source.connect(audioContext.destination);
          }
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
      (window as any).__mediaOpen = false;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioElRef.current) {
      try { audioElRef.current.pause(); } catch {}
      audioElRef.current.srcObject = null;
      if (audioElRef.current.parentNode) {
        audioElRef.current.parentNode.removeChild(audioElRef.current);
      }
      audioElRef.current = null;
    }

    destNodeRef.current = null;
  };

  return null; // Invisível
}
