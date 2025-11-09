import { useEffect } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * Hook para sincronizar estado de chamada entre backend e frontend
 * Escuta eventos do servidor para atualizar estado local
 */
export function useCallSync() {
  const { currentCallId, setCallState } = useCallStore();

  useEffect(() => {
    if (!currentCallId) return;

    // Polling simples para verificar estado da chamada
    const checkCallState = async () => {
      try {
        const response = await fetch(`/api/call/status/${currentCallId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Mapear estado do backend para frontend
          const stateMap: Record<string, any> = {
            'initiating': 'RINGING', // Quando está iniciando, mostrar como RINGING
            'ringing': 'RINGING',
            'answered': 'CONNECTED', 
            'connected': 'CONNECTED',
            'ended': 'ENDED',
            'failed': 'ENDED'
          };

          const newState = stateMap[data.status] || 'IDLE';
          
          // Não sobrescrever RINGING com CONNECTED muito rápido
          const currentState = useCallStore.getState().callState;
          if (currentState === 'RINGING' && newState === 'CONNECTED') {
            // Dar tempo para ringtone tocar antes de mudar para CONNECTED
            console.log(`[CALL_SYNC] Aguardando ringtone... (${data.status} → ${newState})`);
            setTimeout(() => {
              setCallState(newState);
              console.log(`[CALL_SYNC] State updated after delay: ${data.status} → ${newState}`);
            }, 2000); // 2 segundos de delay
          } else {
            setCallState(newState);
            console.log(`[CALL_SYNC] State updated: ${data.status} → ${newState}`);
          }
        }
      } catch (error) {
        console.warn('[CALL_SYNC] Failed to check call state:', error);
      }
    };

    // Verificar estado a cada 3 segundos durante chamada ativa (menos agressivo)
    const interval = setInterval(checkCallState, 3000);

    // Verificação inicial após 1 segundo (não imediata)
    setTimeout(checkCallState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentCallId, setCallState]);
}
