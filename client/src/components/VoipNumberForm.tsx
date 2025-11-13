import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface VoipNumber {
  id?: number;
  number: string;
  provider: string;
  name: string;
  account_id?: string;
  password?: string;
  server?: string;
  is_active: boolean;
}

interface VoipNumberFormProps {
  initialData?: VoipNumber;
  onComplete: () => void;
}

interface FormData {
  number: string;
  provider: string;
  name: string;
  account_id: string;
  password: string;
  server: string;
  is_active: boolean;
}

const providerOptions = [
  {
    value: 'personal',
    label: 'Número Próprio',
    description: 'Seu celular ou telefone fixo',
    serverDefault: ''
  },
  {
    value: 'sobreip',
    label: 'SobreIP',
    description: 'Provedor VoIP brasileiro',
    serverDefault: 'voz.sobreip.com.br'
  },
  {
    value: 'voipms',
    label: 'Voip.ms',
    description: 'Provedor VoIP canadense',
    serverDefault: 'sip.voip.ms'
  },
  {
    value: 'sip2dial',
    label: 'SIP2Dial',
    description: 'Provedor VoIP internacional',
    serverDefault: 'sip.sip2dial.com'
  },
  {
    value: 'vonage',
    label: 'Vonage',
    description: 'Vonage Communications API',
    serverDefault: 'api.vonage.com'
  }
];

export function VoipNumberForm({ initialData, onComplete }: VoipNumberFormProps) {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const isEditing = !!initialData;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      number: initialData?.number || '',
      provider: initialData?.provider || 'personal',
      name: initialData?.name || '',
      account_id: initialData?.account_id || '',
      password: initialData?.password || '',
      server: initialData?.server || '',
      is_active: initialData?.is_active ?? true
    }
  });

  const selectedProvider = watch('provider');
  const currentProviderInfo = providerOptions.find(p => p.value === selectedProvider);

  // Auto-fill server when provider changes
  const handleProviderChange = (value: string) => {
    setValue('provider', value);
    const provider = providerOptions.find(p => p.value === value);
    if (provider) {
      setValue('server', provider.serverDefault);
    }
  };

  // Save/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const endpoint = isEditing 
        ? `/api/voip-numbers/${initialData!.id}` 
        : '/api/voip-numbers';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          account_id: data.account_id || null,
          password: data.password || null,
          server: data.server || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save number');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Número atualizado" : "Número adicionado",
        description: isEditing 
          ? "As informações do número foram atualizadas com sucesso"
          : "O novo número VoIP foi adicionado com sucesso",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar número",
        description: error instanceof Error ? error.message : "Falha ao salvar",
        variant: "destructive",
      });
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsTesting(true);
      setTestResult(null);

      // For personal numbers, skip the test
      if (data.provider === 'personal') {
        return { success: true, message: 'Número próprio não precisa de teste' };
      }

      // Create a temporary number for testing
      const testNumber = {
        number: data.number,
        provider: data.provider,
        name: data.name,
        account_id: data.account_id,
        password: data.password,
        server: data.server,
        is_active: true
      };

      // We'll test by trying to create and immediately delete, or use a test endpoint
      const response = await fetch('/api/voip-numbers/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testNumber)
      });

      if (!response.ok) {
        throw new Error('Falha no teste de credenciais');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsTesting(false);
      setTestResult(data);
      toast({
        title: data.success ? "Teste bem-sucedido" : "Falha no teste",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setIsTesting(false);
      setTestResult({ success: false, message: 'Erro no teste de conexão' });
      toast({
        title: "Erro no teste",
        description: error instanceof Error ? error.message : "Falha no teste",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const handleTest = () => {
    const data = {
      number: watch('number'),
      provider: watch('provider'),
      name: watch('name'),
      account_id: watch('account_id'),
      password: watch('password'),
      server: watch('server'),
      is_active: watch('is_active')
    };
    testMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label htmlFor="provider">Provedor</Label>
        <Select value={selectedProvider} onValueChange={handleProviderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o provedor" />
          </SelectTrigger>
          <SelectContent>
            {providerOptions.map((provider) => (
              <SelectItem key={provider.value} value={provider.value}>
                <div>
                  <div className="font-medium">{provider.label}</div>
                  <div className="text-xs text-muted-foreground">{provider.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome/Identificação</Label>
        <Input
          id="name"
          placeholder="Ex: Linha Principal, Comercial"
          {...register('name', { required: 'Nome é obrigatório' })}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Number */}
      <div className="space-y-2">
        <Label htmlFor="number">Número de Telefone</Label>
        <Input
          id="number"
          placeholder="+5511999999999"
          {...register('number', { 
            required: 'Número é obrigatório',
            pattern: {
              value: /^\+[1-9]\d{1,14}$/,
              message: 'Formato inválido. Use E.164 (+5511999999999)'
            }
          })}
        />
        {errors.number && (
          <p className="text-sm text-red-600">{errors.number.message}</p>
        )}
      </div>

      {/* Provider-specific fields */}
      {selectedProvider !== 'personal' && (
        <>
          {/* Account ID / Username */}
          <div className="space-y-2">
            <Label htmlFor="account_id">
              {selectedProvider === 'voipms' ? 'Usuário/Email' : 
               selectedProvider === 'sobreip' ? 'Usuário SIP' : 
               'Account ID'}
            </Label>
            <Input
              id="account_id"
              placeholder={
                selectedProvider === 'voipms' ? 'seu_email@exemplo.com' : 
                selectedProvider === 'sobreip' ? '1151944022' :
                'Seu ID de usuário'
              }
              {...register('account_id')}
            />
            {selectedProvider === 'sobreip' && (
              <p className="text-xs text-blue-600">
                Exemplo: 1151944022 (fornecido pelo SobreIP)
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {selectedProvider === 'vonage' ? 'API Token' : 
               selectedProvider === 'sobreip' ? 'Senha SIP' :
               'Senha'}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={
                selectedProvider === 'sobreip' ? 'Sua senha SIP (ex: 3yxnn)' :
                'Sua senha ou token'
              }
              {...register('password')}
            />
            {selectedProvider === 'sobreip' && (
              <p className="text-xs text-blue-600">
                Senha fornecida no painel SobreIP
              </p>
            )}
          </div>

          {/* Server */}
          <div className="space-y-2">
            <Label htmlFor="server">Servidor</Label>
            <Input
              id="server"
              placeholder="sip.exemplo.com"
              {...register('server')}
            />
          </div>
        </>
      )}

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={watch('is_active')}
          onCheckedChange={(checked) => setValue('is_active', checked)}
        />
        <Label htmlFor="is_active">Número ativo</Label>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          testResult.success 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {/* Test Button - only for VoIP providers */}
        {selectedProvider !== 'personal' && (
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !watch('number') || !watch('account_id') || !watch('password')}
            className="flex-1"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
        )}

        {/* Save Button */}
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          {saveMutation.isPending 
            ? (isEditing ? 'Atualizando...' : 'Salvando...') 
            : (isEditing ? 'Atualizar' : 'Salvar')
          }
        </Button>
      </div>

      {/* Help Text */}
      {currentProviderInfo && (
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
          <strong>{currentProviderInfo.label}:</strong> {currentProviderInfo.description}
          {selectedProvider === 'personal' && (
            <div className="mt-1">
              Para números próprios, apenas adicione o número no formato E.164. 
              As chamadas serão feitas através do seu dispositivo.
            </div>
          )}
          {selectedProvider === 'sobreip' && (
            <div className="mt-1 space-y-1">
              <div><strong>SobreIP:</strong> Provedor brasileiro com protocolo SIP.</div>
              <div>• <strong>Usuário:</strong> Número fornecido pelo SobreIP (ex: 1151944022)</div>
              <div>• <strong>Senha:</strong> Senha SIP do seu painel (ex: 3yxnn)</div>
              <div>• <strong>Servidor:</strong> Sempre voz.sobreip.com.br</div>
              <div>• <strong>Formato número:</strong> +55 + DDD + número (ex: +5511951944022)</div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
