import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Mic, Volume2 } from 'lucide-react';
import { useCallStore } from '@/stores/useCallStore';

interface VolumeMeterProps {
  audioContext?: AudioContext;
}

export function VolumeMeters({ audioContext }: VolumeMeterProps) {
  const setMicLevel = useCallStore(state => state.setMicLevel);
  const setSpeakerLevel = useCallStore(state => state.setSpeakerLevel);
  const micLevel = useCallStore(state => state.micLevel);
  const outputLevel = useCallStore(state => state.speakerLevel);
  const animationFrameRef = useRef<number>();
  const micAnalyserRef = useRef<AnalyserNode>();
  const outputAnalyserRef = useRef<AnalyserNode>();

  useEffect(() => {
    if (!audioContext) return;

    let micStream: MediaStream | null = null;

    const setupMicrophoneMonitoring = async () => {
      try {
        // Feature-detect MediaDevices antes de capturar microfone
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('[VOLUME_METER] MediaDevices/getUserMedia indisponível. Use HTTPS e permita microfone (se em iframe, use allow="microphone").');
          return;
        }

        // Get microphone stream
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioContext.createMediaStreamSource(micStream);
        const micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 256;
        micSource.connect(micAnalyser);
        micAnalyserRef.current = micAnalyser;

        // Setup output monitoring from all audio elements
        const outputAnalyser = audioContext.createAnalyser();
        outputAnalyser.fftSize = 256;
        outputAnalyserRef.current = outputAnalyser;

        // Connect all audio elements to output analyzer
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach((audio) => {
          try {
            const source = audioContext.createMediaElementSource(audio);
            source.connect(outputAnalyser);
            outputAnalyser.connect(audioContext.destination);
          } catch (e) {
            // Already connected, ignore
          }
        });

        // Start animation loop
        const updateLevels = () => {
          if (micAnalyserRef.current) {
            const micDataArray = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
            micAnalyserRef.current.getByteFrequencyData(micDataArray);
            const micAvg = micDataArray.reduce((sum, val) => sum + val, 0) / micDataArray.length;
            const level = Math.min(100, (micAvg / 255) * 100);
            setMicLevel(level);
          }

          if (outputAnalyserRef.current) {
            const outputDataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
            outputAnalyserRef.current.getByteFrequencyData(outputDataArray);
            const outputAvg = outputDataArray.reduce((sum, val) => sum + val, 0) / outputDataArray.length;
            const level = Math.min(100, (outputAvg / 255) * 100);
            setSpeakerLevel(level);
          }

          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
      } catch (error) {
        console.error('[VOLUME_METER] Failed to setup audio monitoring:', error);
      }
    };

    setupMicrophoneMonitoring();

    return () => {
      // Cleanup: stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Cleanup: stop microphone stream
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      
      // Cleanup: disconnect analyzers
      if (micAnalyserRef.current) {
        micAnalyserRef.current.disconnect();
      }
      if (outputAnalyserRef.current) {
        outputAnalyserRef.current.disconnect();
      }
    };
  }, [audioContext]);

  const getMeterColor = (level: number) => {
    if (level < 30) return 'bg-green-500';
    if (level < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4" data-testid="volume-meters">
      {/* Microphone Level */}
      <div>
        <Label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Mic className="w-4 h-4" />
          Nível do Microfone
        </Label>
        <div className="relative w-full h-6 bg-background border border-border rounded-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${getMeterColor(micLevel)}`}
            style={{ width: `${micLevel}%` }}
            data-testid="mic-level-meter"
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-foreground mix-blend-difference">
            {Math.round(micLevel)}%
          </div>
        </div>
      </div>

      {/* Output/Speaker Level */}
      <div>
        <Label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Volume2 className="w-4 h-4" />
          Nível de Saída (Alto-falante)
        </Label>
        <div className="relative w-full h-6 bg-background border border-border rounded-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${getMeterColor(outputLevel)}`}
            style={{ width: `${outputLevel}%` }}
            data-testid="output-level-meter"
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-foreground mix-blend-difference">
            {Math.round(outputLevel)}%
          </div>
        </div>
      </div>
    </div>
  );
}
