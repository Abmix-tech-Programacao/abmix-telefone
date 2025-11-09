import { useEffect } from 'react';
import { useCallStore } from '@/stores/useCallStore';

/**
 * Hook para sincronizar estado de chamada entre backend e frontend
 * Escuta eventos do servidor para atualizar estado local
 */
export function useCallSync() {
  const { currentCallId, setCallState } = useCallStore();

  useEffect(() => {
    if (!currentCallId) {
      console.log('[CALL_SYNC] No current call ID, skipping sync');
      return;
    }

    console.log(`[CALL_SYNC] Starting sync for call ${currentCallId}`);

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

          // Gate: não mudar para CONNECTED até mídia /media abrir
          const mediaOpen = (window as any).__mediaOpen === true;

          // Regra final:
          // - Se mediaOpen: forçar CONNECTED (já temos mídia válida)
          // - Senão, se veio CONNECTED mas ainda sem mídia: manter RINGING
          // - Caso contrário, usar o estado do backend
          const effectiveState =
            mediaOpen ? 'CONNECTED' :
            (newState === 'CONNECTED' && !mediaOpen) ? 'RINGING' :
            newState;

          setCallState(effectiveState);
          console.log(`[CALL_SYNC] State updated: ${data.status} → ${effectiveState} (mediaOpen=${mediaOpen})`);
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
