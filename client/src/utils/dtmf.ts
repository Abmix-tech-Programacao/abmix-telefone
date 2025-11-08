/**
 * DTMF (Dual-Tone Multi-Frequency) Sound Generator
 * Generates realistic telephone keypad sounds using Web Audio API
 */

// DTMF frequency mappings according to ITU-T standard
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

class DTMFPlayer {
  private audioContext: AudioContext | null = null;
  private readonly storageKey = 'dtmf_sounds_enabled';

  constructor() {
    // Initialize with stored preference, default to true
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) {
      this.setEnabled(true); // Default enabled
    }
  }

  /**
   * Lazy initialization of AudioContext
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Create ADSR envelope to avoid audio clicks
   */
  private createEnvelope(gainNode: GainNode, duration: number): void {
    const now = this.audioContext!.currentTime;
    const attackTime = 0.01;  // 10ms attack
    const releaseTime = 0.02; // 20ms release
    const sustainTime = duration / 1000 - attackTime - releaseTime;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + attackTime); // Attack
    gainNode.gain.setValueAtTime(0.1, now + attackTime + sustainTime); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000); // Release
  }

  /**
   * Play DTMF tone for given key
   * @param key - The key pressed ('0'-'9', '*', '#')
   * @param duration - Duration in milliseconds (default: 100ms)
   */
  async playTone(key: string, duration: number = 100): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const frequencies = DTMF_FREQUENCIES[key];
    if (!frequencies) {
      console.warn(`[DTMF] Invalid key: ${key}`);
      return;
    }

    try {
      const context = this.getAudioContext();
      
      // CRITICAL: Resume context if suspended (required by most browsers)
      if (context.state === 'suspended') {
        console.log('[DTMF] Resuming suspended AudioContext...');
        await context.resume();
      }
      
      // Double-check context is running
      if (context.state !== 'running') {
        console.warn('[DTMF] AudioContext not running, state:', context.state);
        return;
      }

      // Create oscillators for dual-tone
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const gainNode = context.createGain();

      // Configure frequencies
      osc1.frequency.setValueAtTime(frequencies[0], context.currentTime);
      osc2.frequency.setValueAtTime(frequencies[1], context.currentTime);
      
      // Use sine waves for clean DTMF tones
      osc1.type = 'sine';
      osc2.type = 'sine';

      // Connect audio graph: oscillators → gain → destination
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(context.destination);

      // Apply ADSR envelope
      this.createEnvelope(gainNode, duration);

      // Start and stop oscillators
      const now = context.currentTime;
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration / 1000);
      osc2.stop(now + duration / 1000);

    } catch (error) {
      console.error('[DTMF] Error playing tone:', error);
    }
  }

  /**
   * Check if DTMF sounds are enabled
   */
  isEnabled(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  /**
   * Enable or disable DTMF sounds
   */
  setEnabled(enabled: boolean): void {
    localStorage.setItem(this.storageKey, enabled.toString());
  }

  /**
   * Toggle DTMF sounds on/off
   */
  toggleEnabled(): boolean {
    const newState = !this.isEnabled();
    this.setEnabled(newState);
    return newState;
  }

  /**
   * Cleanup resources (call when component unmounts)
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const dtmfPlayer = new DTMFPlayer();

// Export class for testing purposes
export { DTMFPlayer };
