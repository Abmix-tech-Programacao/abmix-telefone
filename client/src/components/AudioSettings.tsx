import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Volume2, Mic, Settings, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

/**
 * AudioSettings - Configurações de dispositivos de áudio
 * Permite selecionar microfone e autofalantes
 */
export function AudioSettings() {
  const { toast } = useToast();
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // Carregar dispositivos disponíveis
  useEffect(() => {
    loadAudioDevices();
    loadSavedSettings();
  }, []);

  const loadAudioDevices = async () => {
    try {
      // Solicitar permissão para microfone primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Listar todos os dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];

      devices.forEach(device => {
        if (device.kind === 'audioinput') {
          inputs.push({
            deviceId: device.deviceId,
            label: device.label || `Microfone ${inputs.length + 1}`,
            kind: 'audioinput'
          });
        } else if (device.kind === 'audiooutput') {
          outputs.push({
            deviceId: device.deviceId,
            label: device.label || `Autofalante ${outputs.length + 1}`,
            kind: 'audiooutput'
          });
        }
      });

      setInputDevices(inputs);
      setOutputDevices(outputs);

      console.log('[AUDIO_SETTINGS] 🎤 Dispositivos de entrada encontrados:', inputs.length);
      console.log('[AUDIO_SETTINGS] 🔊 Dispositivos de saída encontrados:', outputs.length);

    } catch (error) {
      console.error('[AUDIO_SETTINGS] Erro ao carregar dispositivos:', error);
      toast({
        title: "Erro de Áudio",
        description: "Não foi possível acessar dispositivos de áudio",
        variant: "destructive",
      });
    }
  };

  const loadSavedSettings = () => {
    const savedInput = localStorage.getItem('audioInputDevice');
    const savedOutput = localStorage.getItem('audioOutputDevice');
    
    if (savedInput) setSelectedInput(savedInput);
    if (savedOutput) setSelectedOutput(savedOutput);
  };

  const saveAudioSettings = (inputId: string, outputId: string) => {
    localStorage.setItem('audioInputDevice', inputId);
    localStorage.setItem('audioOutputDevice', outputId);
    
    toast({
      title: "✅ Configurações Salvas",
      description: "Dispositivos de áudio configurados",
    });
  };

  const testMicrophone = async () => {
    if (isTestingMic) {
      setIsTestingMic(false);
      setMicLevel(0);
      return;
    }

    try {
      setIsTestingMic(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedInput ? { deviceId: selectedInput } : true
      });

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!isTestingMic) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.round((average / 255) * 100));
        
        requestAnimationFrame(updateLevel);
      };
      
      updateLevel();

      // Parar após 10 segundos
      setTimeout(() => {
        setIsTestingMic(false);
        setMicLevel(0);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }, 10000);

    } catch (error) {
      console.error('[AUDIO_SETTINGS] Erro no teste de microfone:', error);
      setIsTestingMic(false);
      toast({
        title: "Erro no Teste",
        description: "Não foi possível testar o microfone",
        variant: "destructive",
      });
    }
  };

  const testSpeakers = async () => {
    if (isTestingSpeaker) {
      setIsTestingSpeaker(false);
      return;
    }

    try {
      setIsTestingSpeaker(true);
      
      // Criar tom de teste (440Hz - Lá)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

      oscillator.start();
      
      // Parar após 2 segundos
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setIsTestingSpeaker(false);
      }, 2000);

    } catch (error) {
      console.error('[AUDIO_SETTINGS] Erro no teste de autofalantes:', error);
      setIsTestingSpeaker(false);
      toast({
        title: "Erro no Teste",
        description: "Não foi possível testar os autofalantes",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Áudio
          </CardTitle>
          <CardDescription>
            Selecione os dispositivos de entrada e saída de áudio para as ligações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Dispositivo de Entrada (Microfone) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <label className="text-sm font-medium">Dispositivo de Entrada (Microfone)</label>
            </div>
            
            <Select
              value={selectedInput}
              onValueChange={(value) => {
                setSelectedInput(value);
                saveAudioSettings(value, selectedOutput);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um microfone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Padrão do Sistema</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3">
              <Button
                variant={isTestingMic ? "destructive" : "outline"}
                size="sm"
                onClick={testMicrophone}
                className="flex items-center gap-2"
              >
                {isTestingMic ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isTestingMic ? 'Parar Teste' : 'Testar Microfone'}
              </Button>
              
              {isTestingMic && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{micLevel}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Dispositivo de Saída (Autofalantes) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <label className="text-sm font-medium">Dispositivo de Saída (Autofalantes)</label>
            </div>
            
            <Select
              value={selectedOutput}
              onValueChange={(value) => {
                setSelectedOutput(value);
                saveAudioSettings(selectedInput, value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um autofalante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Padrão do Sistema</SelectItem>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={isTestingSpeaker ? "destructive" : "outline"}
              size="sm"
              onClick={testSpeakers}
              className="flex items-center gap-2"
            >
              {isTestingSpeaker ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isTestingSpeaker ? 'Parando...' : 'Testar Autofalantes'}
            </Button>
          </div>

          {/* Informações dos Dispositivos */}
          <div className="pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Dispositivos Encontrados:</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <div>🎤 Microfones: {inputDevices.length}</div>
              <div>🔊 Autofalantes: {outputDevices.length}</div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
