import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';
import { getAudioContext } from '@/lib/audio/unlockAudio';

export function Ringtone() {
  const { callState } = useCallStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const playRingtone = async () => {
      try {
        const audioContext = (audioContextRef.current ||= getAudioContext());
        
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
          // Verifica se deve parar (mídia abriu ou estado mudou)
          const mediaOpen = (window as any).__mediaOpen === true;
          if (mediaOpen || callState !== 'RINGING') {
            stopRingtone();
            return;
          }

          playTone(440, 0.4); // Primeira nota
          setTimeout(() => playTone(554, 0.4), 500); // Segunda nota
          
          // Repetir a cada 2 segundos
          timeoutRef.current = setTimeout(() => {
            const stillRinging = callState === 'RINGING' && !(window as any).__mediaOpen;
            if (stillRinging) {
              playPattern();
            } else {
              stopRingtone();
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
    
    // Para o ringtone se mídia abriu OU estado não é RINGING
    const mediaOpen = (window as any).__mediaOpen === true;
    const shouldStop = mediaOpen || callState !== 'RINGING';
    
    if (callState === 'RINGING' && !mediaOpen) {
      console.log('[RINGTONE] Starting ringtone...');
      playRingtone();
    } else {
      console.log('[RINGTONE] Stopping ringtone...');
      stopRingtone();
    }

    // Monitora mudanças no mediaOpen
    const checkMediaOpen = setInterval(() => {
      const nowOpen = (window as any).__mediaOpen === true;
      if (nowOpen && callState === 'RINGING') {
        console.log('[RINGTONE] Media opened, stopping ringtone');
        stopRingtone();
      }
    }, 500);

    return () => {
      clearInterval(checkMediaOpen);
      stopRingtone();
    };
  }, [callState]);

  return null;
}
