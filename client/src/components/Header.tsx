import { useEffect, useState } from 'react';
import { useCallStore } from '@/stores/useCallStore';
import { metricsService } from '@/services/metrics';

export function Header() {
  const { callState, latency } = useCallStore();
  const setLatency = useCallStore(state => state.setLatency);

  // Connect to real-time metrics (DESABILITADO temporariamente)
  useEffect(() => {
    // metricsService.connect((data) => {
    //   setLatency(data.latencyMs);
    // });

    // return () => {
    //   metricsService.disconnect();
    // };
  }, [setLatency]);

  const getStatusConfig = (state: string) => {
    const configs = {
      'IDLE': { color: 'bg-gray-500', text: 'Idle', textClass: '' },
      'RINGING': { color: 'bg-yellow-500', text: 'Chamando...', textClass: 'text-yellow-400' },
      'CONNECTED': { color: 'bg-abmix-green', text: 'Conectado', textClass: 'text-abmix-green' },
      'ENDED': { color: 'bg-red-500', text: 'Encerrada', textClass: 'text-red-400' }
    };
    return configs[state as keyof typeof configs] || configs.IDLE;
  };

  const statusConfig = getStatusConfig(callState);

  return (
    <header className="bg-dark-surface border-b border-dark-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Call Status - Only show during active call */}
        <div className="flex items-center space-x-6">
          {callState !== 'IDLE' && (
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 ${statusConfig.color} rounded-full`} data-testid="status-indicator"></div>
              <span className={`text-lg font-semibold ${statusConfig.textClass}`} data-testid="call-state">
                {statusConfig.text}
              </span>
            </div>
          )}
          {callState === 'CONNECTED' && (
            <div className="text-sm text-gray-400">
              Latência: <span className="text-abmix-green" data-testid="latency-display">
                {latency > 0 ? `${Math.round(latency)} ms` : '-- ms'}
              </span>
            </div>
          )}
        </div>

        {/* Audio Controls - TEMPORARIAMENTE DESABILITADO para corrigir problemas de performance */}
        <div className="flex items-center space-x-6">
          <div className="text-sm text-gray-400">
            Controles de áudio temporariamente desabilitados
          </div>
        </div>
      </div>
    </header>
  );
}