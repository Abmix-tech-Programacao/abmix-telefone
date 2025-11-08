import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * Ringtone - Componente para tocar som de chamando
 * Toca ringtone quando callState é 'RINGING'
 */
export function Ringtone() {
  const { callState } = useCallStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const playRingtone = async () => {
      try {
        // Usar AudioContext para gerar ringtone sintético
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
        }

        const context = audioContextRef.current;
        
        // Resume context se suspenso
        if (context.state === 'suspended') {
          await context.resume();
        }

        // Criar ringtone (440Hz + 880Hz - acorde simples)
        const osc1 = context.createOscillator();
        const osc2 = context.createOscillator();
        const gainNode = context.createGain();

        osc1.frequency.setValueAtTime(440, context.currentTime); // A4
        osc2.frequency.setValueAtTime(880, context.currentTime); // A5
        
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(context.destination);

        // Volume baixo para não incomodar
        gainNode.gain.setValueAtTime(0.1, context.currentTime);

        // Tocar por 1 segundo, pausar 2 segundos, repetir
        const startTime = context.currentTime;
        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 1.0);
        osc2.stop(startTime + 1.0);

        oscillatorRef.current = osc1;

        console.log('[RINGTONE] Playing ringtone...');

        // Agendar próximo ringtone se ainda estiver chamando
        timeoutRef.current = setTimeout(() => {
          if (callState === 'RINGING') {
            playRingtone();
          }
        }, 3000); // 3 segundos de intervalo

      } catch (error) {
        console.error('[RINGTONE] Error playing ringtone:', error);
      }
    };

    const stopRingtone = () => {
      // Parar timeout pendente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Parar oscillator atual
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {
          // Oscillator já parado
        }
        oscillatorRef.current = null;
      }
      console.log('[RINGTONE] Ringtone stopped');
    };

    // Controlar ringtone baseado no estado da chamada
    console.log(`[RINGTONE] Call state changed to: ${callState}`);
    
    if (callState === 'RINGING') {
      console.log('[RINGTONE] Starting ringtone...');
      playRingtone();
    } else {
      console.log('[RINGTONE] Stopping ringtone...');
      stopRingtone();
    }

    // Cleanup
    return () => {
      stopRingtone();
    };
  }, [callState]);

  // Componente invisível
  return null;
}
