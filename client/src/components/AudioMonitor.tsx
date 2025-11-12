import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * AudioMonitor - VERSÃO SIMPLIFICADA QUE FUNCIONA
 * Monitora apenas o microfone em tempo real
 */
export function AudioMonitor() {
  const setMicLevel = useCallStore(state => state.setMicLevel);
  const setSpeakerLevel = useCallStore(state => state.setSpeakerLevel);
  
  const animationFrameRef = useRef<number>();
  const micAnalyserRef = useRef<AnalyserNode>();
  const micStreamRef = useRef<MediaStream>();

  useEffect(() => {
    console.log('[AUDIO_MONITOR] 🎤 Iniciando monitoramento simplificado');

    const setup = async () => {
      try {
        // 1. Pegar microfone
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        micStreamRef.current = stream;
        console.log('[AUDIO_MONITOR] ✅ Microfone obtido');

        // 2. Criar AudioContext
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AC();
        
        // Resume se suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // 3. Criar analyser para microfone
        const micSource = audioContext.createMediaStreamSource(stream);
        const micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 256;
        micAnalyser.smoothingTimeConstant = 0.8;
        micSource.connect(micAnalyser);
        micAnalyserRef.current = micAnalyser;

        console.log('[AUDIO_MONITOR] ✅ Analyser conectado');

        // 4. Loop de atualização
        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        let lastMicUpdate = 0;

        const updateLevels = (timestamp: number) => {
          // Atualizar mic a cada 50ms (20fps)
          if (timestamp - lastMicUpdate > 50) {
            if (micAnalyserRef.current) {
              micAnalyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
              const level = Math.min(100, Math.round((average / 255) * 100));
              setMicLevel(level);
            }
            lastMicUpdate = timestamp;
          }

          // Speaker level vem do AudioPlayer diretamente
          // Aqui só resetamos se não houver chamada ativa
          const callState = useCallStore.getState().callState;
          if (callState !== 'CONNECTED') {
            setSpeakerLevel(0);
          }

          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        animationFrameRef.current = requestAnimationFrame(updateLevels);
        console.log('[AUDIO_MONITOR] ✅ Loop de atualização iniciado');

      } catch (error) {
        console.error('[AUDIO_MONITOR] ❌ Erro ao configurar:', error);
      }
    };

    setup();

    // Cleanup
    return () => {
      console.log('[AUDIO_MONITOR] 🛑 Limpando recursos');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (micAnalyserRef.current) {
        try {
          micAnalyserRef.current.disconnect();
        } catch {}
      }
    };
  }, [setMicLevel, setSpeakerLevel]);

  return null;
}
