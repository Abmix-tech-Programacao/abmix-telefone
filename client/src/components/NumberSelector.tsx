import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhoneCall, Plus, Settings, RefreshCw, AlertCircle, Smartphone } from 'lucide-react';

interface VoipNumber {
  id: number;
  number: string;
  provider: string;
  name: string;
  is_active: boolean;
}

interface NumberSelectorProps {
  selectedNumberId?: string;
  onNumberChange: (numberId: string | undefined) => void;
  onManageNumbers?: () => void;
  className?: string;
}

export function NumberSelector({ 
  selectedNumberId, 
  onNumberChange, 
  onManageNumbers,
  className = ""
}: NumberSelectorProps) {
  // Fetch active VoIP numbers
  const { data: voipNumbers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['voip-numbers-active'],
    queryFn: async () => {
      const response = await fetch('/api/voip-numbers/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active VoIP numbers');
      }
      return response.json() as Promise<VoipNumber[]>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Auto-select first number if none selected and numbers available
  useEffect(() => {
    if (!selectedNumberId && voipNumbers.length > 0) {
      onNumberChange(voipNumbers[0].id.toString());
    }
  }, [selectedNumberId, voipNumbers, onNumberChange]);

  const getProviderColor = (provider: string) => {
    // Usar cores padrão do sistema
    return 'bg-secondary text-secondary-foreground';
  };

  const selectedNumber = voipNumbers.find(n => n.id.toString() === selectedNumberId);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium text-muted-foreground">
          Número de Origem
        </Label>
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium text-muted-foreground">
          Número de Origem
        </Label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-10 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-sm text-red-700">Erro ao carregar números</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (voipNumbers.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium text-muted-foreground">
          Número de Origem
        </Label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center text-yellow-700">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Nenhum número configurado</span>
            </div>
          </div>
          {onManageNumbers && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onManageNumbers}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          Número de Origem
        </Label>
        <div className="flex items-center space-x-1">
          {onManageNumbers && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageNumbers}
              className="h-auto p-1 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-auto p-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Select value={selectedNumberId || ''} onValueChange={(value) => onNumberChange(value || undefined)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione o número de origem">
            {selectedNumber && (
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedNumber.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedNumber.number}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {voipNumbers.map((number) => (
            <SelectItem key={number.id} value={number.id.toString()}>
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Smartphone className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">{number.name}</span>
                      <Badge className={`${getProviderColor(number.provider)} flex-shrink-0`}>
                        {number.provider}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {number.number}
                    </div>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Display selected number info */}
      {selectedNumber && (
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{selectedNumber.name}</span>
                  <Badge className={getProviderColor(selectedNumber.provider)}>
                    {selectedNumber.provider}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {selectedNumber.number}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{voipNumbers.length} número{voipNumbers.length !== 1 ? 's' : ''} disponível{voipNumbers.length !== 1 ? 'eis' : ''}</span>
        {onManageNumbers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageNumbers}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Gerenciar números
          </Button>
        )}
      </div>
    </div>
  );
}
