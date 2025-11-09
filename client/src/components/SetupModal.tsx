import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function SetupModal({ isOpen, onComplete }: SetupModalProps) {
  const [step, setStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState({
    ELEVENLABS_API_KEY: ''
  });

  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateKeys = async () => {
    setIsValidating(true);

    try {
      // Check if backend is already configured
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();

      if (healthData.status === 'healthy') {
        localStorage.setItem('abmix_setup_complete', 'true');
        toast({
          title: "Sistema Já Configurado",
          description: "Todas as chaves estão funcionando no servidor!",
        });
        onComplete();
        return;
      }

      // If not healthy, show error
      const missingKeys = healthData.missing_variables || [];
      toast({
        title: "Configuração Necessária",
        description: `Faltam configurar: ${missingKeys.join(', ')}`,
        variant: "destructive"
      });

    } catch (error) {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Form is always valid since backend is configured

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="max-w-2xl" data-testid="setup-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CheckCircle className="text-primary-foreground w-5 h-5" />
            </div>
            Sistema Abmix - Pronto para Uso
          </DialogTitle>
          <DialogDescription>
            Todas as APIs estão configuradas e funcionando. O sistema está pronto para fazer chamadas com IA!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-[#10B981] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
            </div>
            <div className={`h-px w-12 ${step > 1 ? 'bg-[#10B981]' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-[#10B981] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                  Sistema Pronto para Uso
                </CardTitle>
                <CardDescription>
                  O servidor está configurado com todas as chaves necessárias:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-green-900">✅ APIs Configuradas</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• ElevenLabs → Síntese de voz e transcrição</li>
                      <li>• OpenAI → Inteligência artificial conversacional</li>
                      <li>• Deepgram → Transcrição backup de alta qualidade</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-blue-900">📞 VoIP Configurado</h4>
                    <p className="text-sm text-blue-800">
                      SobreIP está configurado e pronto para uso. Você pode adicionar 
                      mais números VoIP nas configurações do sistema.
                    </p>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-purple-900">🚀 Funcionalidades Ativas</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Discagem VoIP com IA conversacional</li>
                      <li>• Gravação e transcrição automática</li>
                      <li>• Controles avançados (hold, mute, DTMF, transfer)</li>
                      <li>• Dashboard de métricas em tempo real</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={validateKeys}
                    disabled={isValidating}
                    data-testid="button-validate-keys"
                  >
                    {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isValidating ? 'Verificando...' : 'Acessar Sistema'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}