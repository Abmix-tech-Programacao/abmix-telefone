import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';

type MediaDev = { deviceId: string; kind: string; label: string };

export function AudioSettings() {
  const [inputs, setInputs] = useState<MediaDev[]>([]);
  const [outputs, setOutputs] = useState<MediaDev[]>([]);
  const [inputSel, setInputSel] = useState(localStorage.getItem('audioInputDevice') || '');
  const [outputSel, setOutputSel] = useState(localStorage.getItem('audioOutputDevice') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dtmfEnabled, setDtmfEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('dtmf_sounds_enabled');
    return stored === null ? true : stored === 'true';
  });

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      if (navigator.mediaDevices?.getUserMedia) {
        // Solicita permissão para revelar labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      setInputs(list.filter(d => d.kind === 'audioinput').map(d => ({
        deviceId: d.deviceId, kind: d.kind, label: d.label || 'Microfone'
      })));
      setOutputs(list.filter(d => d.kind === 'audiooutput').map(d => ({
        deviceId: d.deviceId, kind: d.kind, label: d.label || 'Alto-falante'
      })));
    } catch (e: any) {
      setError('Não foi possível listar dispositivos. Use HTTPS e permita o microfone.');
      console.warn('[AUDIO_SETTINGS] enumerateDevices falhou:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const save = () => {
    localStorage.setItem('audioInputDevice', inputSel || '');
    localStorage.setItem('audioOutputDevice', outputSel || '');
    localStorage.setItem('dtmf_sounds_enabled', dtmfEnabled ? 'true' : 'false');
    // Feedback visual simples no padrão do app
    // (evitar alert intrusivo)
    console.log('[AUDIO_SETTINGS] Dispositivos salvos:', { inputSel, outputSel });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="text-lg font-semibold">Configurações de Áudio</div>
      <div className="text-sm text-muted-foreground">
        Escolha os dispositivos de entrada (microfone) e saída (alto‑falante).
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Entrada (Microfone)</div>
          <select
            className="w-full p-2 bg-background border border-border rounded-md"
            value={inputSel}
            onChange={(e) => setInputSel(e.target.value)}
          >
            <option value="">Padrão do sistema</option>
            {inputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Saída (Alto‑falante)</div>
          <select
            className="w-full p-2 bg-background border border-border rounded-md"
            value={outputSel}
            onChange={(e) => setOutputSel(e.target.value)}
          >
            <option value="">Padrão do sistema</option>
            {outputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground">
            A troca de saída depende do navegador (setSinkId). Em caso de limitação, use o padrão do sistema.
          </div>
        </div>
      </div>

      {/* Sons do Teclado (DTMF) */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border p-3">
        <div>
          <div className="text-sm font-medium">Som das teclas (DTMF)</div>
          <div className="text-xs text-muted-foreground">
            Emite bip ao pressionar as teclas do discador/DTMF.
          </div>
        </div>
        <Switch
          checked={dtmfEnabled}
          onCheckedChange={(checked) => {
            setDtmfEnabled(checked);
            localStorage.setItem('dtmf_sounds_enabled', checked ? 'true' : 'false');
            // Notifica outros hooks pela StorageEvent
            window.dispatchEvent(new StorageEvent('storage', { key: 'dtmf_sounds_enabled', newValue: checked ? 'true' : 'false' } as any));
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={save}
        >
          Salvar
        </button>
        <button
          className="px-3 py-2 bg-muted text-foreground rounded-md border border-border"
          onClick={loadDevices}
          disabled={loading}
        >
          {loading ? 'Atualizando…' : 'Atualizar lista'}
        </button>
      </div>
    </div>
  );
}

