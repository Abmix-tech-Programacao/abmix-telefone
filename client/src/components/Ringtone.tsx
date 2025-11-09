import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

export function Ringtone() {
  const { callState } = useCallStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const playRingtone = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const playTone = (frequency: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + duration);
        };

        // Padrão de ringtone brasileiro: 2 toques + pausa
        const playPattern = () => {
          playTone(440, 0.4); // Primeira nota
          setTimeout(() => playTone(554, 0.4), 500); // Segunda nota
          
          // Repetir a cada 2 segundos
          timeoutRef.current = setTimeout(() => {
            if (callState === 'RINGING') {
              playPattern();
            }
          }, 2000);
        };

        playPattern();
        console.log('[RINGTONE] Ringtone started');

      } catch (error) {
        console.error('[RINGTONE] Error starting ringtone:', error);
      }
    };

    const stopRingtone = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {
          // Oscillator already stopped
        }
        oscillatorRef.current = null;
      }
      
      console.log('[RINGTONE] Ringtone stopped');
    };

    console.log(`[RINGTONE] Call state changed to: ${callState}`);
    
    const mediaOpen = (window as any).__mediaOpen === true;

    if (callState === 'RINGING') {
      console.log('[RINGTONE] Starting ringtone...');
      playRingtone();
    } else if (callState === 'CONNECTED' && !mediaOpen) {
      // Evitar parar cedo: manter tocando até mídia abrir
      console.log('[RINGTONE] CONNECTED sem mídia pronta, mantendo ringtone...');
      playRingtone();
    } else {
      console.log('[RINGTONE] Stopping ringtone...');
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [callState]);

  return null;
}
