let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) {
      throw new Error('AudioContext API não disponível neste navegador');
    }
    sharedAudioContext = new AC();
  }
  return sharedAudioContext;
}

/**
 * Registra listeners para garantir que o AudioContext seja ativado
 * no primeiro gesto do usuário (click/touch/keydown).
 */
export function unlockAudioOnce(): void {
  const tryResume = async () => {
    const ctx = getAudioContext();
    try {
      if (ctx.state !== 'running') {
        await ctx.resume();
      }
    } catch {
      // ignore
    } finally {
      window.removeEventListener('click', tryResume);
      window.removeEventListener('touchstart', tryResume);
      window.removeEventListener('keydown', tryResume);
    }
  };

  window.addEventListener('click', tryResume, { once: true, passive: true });
  window.addEventListener('touchstart', tryResume, { once: true, passive: true });
  window.addEventListener('keydown', tryResume, { once: true, passive: true });
}

