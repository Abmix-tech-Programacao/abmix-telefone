import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * AudioMonitor - Componente invisível que monitora níveis de áudio globalmente
 * Atualiza o store com níveis de microfone e autofalante em tempo real
 */
export function AudioMonitor() {
  const setMicLevel = useCallStore(state => state.setMicLevel);
  const setSpeakerLevel = useCallStore(state => state.setSpeakerLevel);
  
  const animationFrameRef = useRef<number>();
  const micAnalyserRef = useRef<AnalyserNode>();
  const outputAnalyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    let micStream: MediaStream | null = null;

    const setupAudioMonitoring = async () => {
      try {
        // Create AudioContext
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          (window as any).audioContext = audioContextRef.current;
        }

        const audioContext = audioContextRef.current;

        // Setup microphone monitoring
        try {
          // Feature-detect MediaDevices (CORREÇÃO FINAL)
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('[AUDIO_MONITOR] MediaDevices não disponível - monitoramento desabilitado');
            return;
          }
          
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const micSource = audioContext.createMediaStreamSource(micStream);
          const micAnalyser = audioContext.createAnalyser();
          micAnalyser.fftSize = 256;
          micSource.connect(micAnalyser);
          micAnalyserRef.current = micAnalyser;
        } catch (error) {
          console.warn('[AUDIO_MONITOR] Microphone access denied:', error);
        }

        // Setup output monitoring
        const outputAnalyser = audioContext.createAnalyser();
        outputAnalyser.fftSize = 256;
        outputAnalyserRef.current = outputAnalyser;

        // Connect all audio elements to output analyzer
        const connectAudioElements = () => {
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach((audio) => {
            try {
              const source = audioContext.createMediaElementSource(audio);
              source.connect(outputAnalyser);
              outputAnalyser.connect(audioContext.destination);
            } catch (e) {
              // Already connected, ignore
            }
          });
        };

        connectAudioElements();

        // Watch for new audio elements
        const observer = new MutationObserver(connectAudioElements);
        observer.observe(document.body, { childList: true, subtree: true });

        // Animation loop to update levels
        const updateLevels = () => {
          // Update mic level
          if (micAnalyserRef.current) {
            const micDataArray = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
            micAnalyserRef.current.getByteFrequencyData(micDataArray);
            const micAvg = micDataArray.reduce((sum, val) => sum + val, 0) / micDataArray.length;
            const level = Math.min(100, (micAvg / 255) * 100);
            setMicLevel(level);
          }

          // Update speaker level
          if (outputAnalyserRef.current) {
            const outputDataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
            outputAnalyserRef.current.getByteFrequencyData(outputDataArray);
            const outputAvg = outputDataArray.reduce((sum, val) => sum + val, 0) / outputDataArray.length;
            const level = Math.min(100, (outputAvg / 255) * 100);
            setSpeakerLevel(level);
          }

          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();

        return () => {
          observer.disconnect();
        };
      } catch (error) {
        console.error('[AUDIO_MONITOR] Failed to setup audio monitoring:', error);
      }
    };

    setupAudioMonitoring();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      if (micAnalyserRef.current) {
        micAnalyserRef.current.disconnect();
      }
      if (outputAnalyserRef.current) {
        outputAnalyserRef.current.disconnect();
      }
    };
  }, [setMicLevel, setSpeakerLevel]);

  // Componente invisível
  return null;
}
