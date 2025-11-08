import { useEffect, useState } from 'react';
import { useCallStore } from '@/stores/useCallStore';
import { metricsService } from '@/services/metrics';
import { Slider } from '@/components/ui/slider';
import { Mic, Volume2 } from 'lucide-react';

export function Header() {
  const { callState, latency, micLevel, speakerLevel } = useCallStore();
  const setLatency = useCallStore(state => state.setLatency);
  const [micVolume, setMicVolume] = useState(80);
  const [speakerVolume, setSpeakerVolume] = useState(80);

  // Connect to real-time metrics
  useEffect(() => {
    metricsService.connect((data) => {
      setLatency(data.latencyMs);
    });

    return () => {
      metricsService.disconnect();
    };
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

        {/* Audio Controls - Volume + Level Bars - RESTAURADO COMO ESTAVA */}
        <div className="flex items-center space-x-6">
          {/* Microphone Control */}
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4 text-gray-400" />
            <div className="flex flex-col items-center gap-1">
              <Slider
                value={[micVolume]}
                onValueChange={(val) => setMicVolume(val[0])}
                max={100}
                step={1}
                className="w-24"
                data-testid="mic-volume-slider"
              />
              <div className="w-24 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-150" 
                  style={{ width: `${micLevel}%` }}
                  data-testid="mic-level-bar"
                ></div>
              </div>
            </div>
            <span className="text-xs text-gray-400 w-8">{micVolume}%</span>
          </div>
          
          {/* Speaker Control */}
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <div className="flex flex-col items-center gap-1">
              <Slider
                value={[speakerVolume]}
                onValueChange={(val) => {
                  const newVol = val[0];
                  setSpeakerVolume(newVol);
                  // Apply to all audio elements
                  const audioElements = document.querySelectorAll('audio');
                  audioElements.forEach(audio => {
                    audio.volume = newVol / 100;
                  });
                }}
                max={100}
                step={1}
                className="w-24"
                data-testid="speaker-volume-slider"
              />
              <div className="w-24 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-150" 
                  style={{ width: `${speakerLevel}%` }}
                  data-testid="speaker-level-bar"
                ></div>
              </div>
            </div>
            <span className="text-xs text-gray-400 w-8">{speakerVolume}%</span>
          </div>
        </div>
      </div>
    </header>
  );
}