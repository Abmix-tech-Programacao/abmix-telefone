import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

/**
 * AudioActivator - Componente para ativar AudioContext
 * Necessário para navegadores que bloqueiam áudio sem interação do usuário
 */
export function AudioActivator() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showActivator, setShowActivator] = useState(true);

  useEffect(() => {
    // Verificar se já existe um AudioContext ativo
    const checkAudioContext = () => {
      if (typeof window !== 'undefined') {
        const existingContext = (window as any).audioContext;
        if (existingContext && existingContext.state === 'running') {
          setAudioEnabled(true);
          setShowActivator(false);
        }
      }
    };

    checkAudioContext();
  }, []);

  const activateAudio = async () => {
    try {
      // Criar ou reativar AudioContext
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      let audioContext = (window as any).audioContext;
      
      if (!audioContext) {
        audioContext = new AudioContext();
        (window as any).audioContext = audioContext;
      }

      // Forçar resume se suspenso
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Tocar um som silencioso para ativar
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.001); // 1ms silencioso

      setAudioEnabled(true);
      setShowActivator(false);
      
      console.log('[AUDIO_ACTIVATOR] AudioContext ativado com sucesso!');
    } catch (error) {
      console.error('[AUDIO_ACTIVATOR] Erro ao ativar áudio:', error);
    }
  };

  if (!showActivator || audioEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        onClick={activateAudio}
        className="bg-abmix-green text-black hover:bg-abmix-green/90 shadow-lg"
        size="sm"
      >
        <Volume2 className="w-4 h-4 mr-2" />
        Ativar Áudio
      </Button>
    </div>
  );
}
