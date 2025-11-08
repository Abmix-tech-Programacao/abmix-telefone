import { useState, useEffect, useCallback } from 'react';
import { dtmfPlayer } from '@/utils/dtmf';

/**
 * React hook for managing DTMF sounds
 * Provides state management and methods for DTMF tone generation
 */
export function useDTMF() {
  const [enabled, setEnabledState] = useState<boolean>(() => dtmfPlayer.isEnabled());

  /**
   * Play DTMF tone for given key
   */
  const playTone = useCallback(async (key: string, duration?: number) => {
    try {
      await dtmfPlayer.playTone(key, duration);
    } catch (error) {
      console.warn('[DTMF] Failed to play tone:', error);
    }
  }, []);

  /**
   * Toggle DTMF sounds on/off and persist preference
   */
  const toggleEnabled = useCallback(() => {
    const newState = dtmfPlayer.toggleEnabled();
    setEnabledState(newState);
  }, []);

  /**
   * Set DTMF enabled state and persist preference
   */
  const setEnabled = useCallback((value: boolean) => {
    dtmfPlayer.setEnabled(value);
    setEnabledState(value);
  }, []);

  /**
   * Listen for localStorage changes from other tabs/windows
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dtmf_sounds_enabled' && e.newValue !== null) {
        setEnabledState(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Note: We don't dispose dtmfPlayer here as it's a singleton
      // and might be used by other components
    };
  }, []);

  return {
    enabled,
    playTone,
    toggleEnabled,
    setEnabled
  };
}
