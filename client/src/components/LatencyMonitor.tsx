import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Activity } from 'lucide-react';
import { useCallStore } from '@/stores/useCallStore';

export function LatencyMonitor() {
  const [latency, setLatency] = useState(0);
  const { callState } = useCallStore();

  useEffect(() => {
    if (callState !== 'CONNECTED') return;

    // Poll latency every 2 seconds during active call
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const data = await response.json();
          setLatency(data.latency || 0);
        }
      } catch (error) {
        console.error('[LATENCY_MONITOR] Failed to fetch metrics:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [callState]);

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyStatus = (ms: number) => {
    if (ms < 100) return 'Excelente';
    if (ms < 200) return 'Boa';
    if (ms < 300) return 'Regular';
    return 'Alta';
  };

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border" data-testid="latency-monitor">
      <Label className="flex items-center gap-2 text-sm font-medium mb-3">
        <Activity className="w-4 h-4" />
        Latência em Tempo Real
      </Label>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-mono font-bold ${latency > 0 ? getLatencyColor(latency) : 'text-muted-foreground'}`} data-testid="latency-value">
            {latency > 0 ? latency : '--'}
          </span>
          <span className="text-sm text-muted-foreground">ms</span>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${latency > 0 ? getLatencyColor(latency) : 'text-muted-foreground'}`}>
            {latency > 0 ? getLatencyStatus(latency) : 'Sem dados'}
          </div>
          <div className="text-xs text-muted-foreground">
            {callState === 'CONNECTED' ? 'Monitorando...' : 'Aguardando chamada'}
          </div>
        </div>
      </div>
      
      <div className="mt-3 h-2 bg-background rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            latency < 100 ? 'bg-green-500' :
            latency < 300 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(100, (latency / 500) * 100)}%` }}
        />
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        {'< 100ms: Excelente | 100-200ms: Boa | 200-300ms: Regular | >300ms: Alta'}
      </p>
    </div>
  );
}
