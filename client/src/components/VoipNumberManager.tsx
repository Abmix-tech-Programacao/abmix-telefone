import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  PhoneCall, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle 
} from 'lucide-react';
import { VoipNumberForm } from './VoipNumberForm';

interface VoipNumber {
  id: number;
  number: string;
  provider: string;
  name: string;
  account_id?: string;
  password?: string;
  server?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function VoipNumberManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState<VoipNumber | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  // Fetch VoIP numbers
  const { data: voipNumbers = [], isLoading, error } = useQuery({
    queryKey: ['voip-numbers'],
    queryFn: async () => {
      const response = await fetch('/api/voip-numbers');
      if (!response.ok) {
        throw new Error('Failed to fetch VoIP numbers');
      }
      return response.json() as Promise<VoipNumber[]>;
    }
  });

  // Toggle number status
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/voip-numbers/${id}/toggle`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to toggle number status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voip-numbers'] });
      toast({
        title: "Status atualizado",
        description: "O status do número foi alterado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error instanceof Error ? error.message : "Falha ao alterar status",
        variant: "destructive",
      });
    }
  });

  // Delete number
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/voip-numbers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete number');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voip-numbers'] });
      toast({
        title: "Número removido",
        description: "O número VoIP foi removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover número",
        description: error instanceof Error ? error.message : "Falha ao remover número",
        variant: "destructive",
      });
    }
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      setTestingId(id);
      const response = await fetch(`/api/voip-numbers/${id}/test`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to test connection');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setTestingId(null);
      toast({
        title: data.success ? "Conexão bem-sucedida" : "Falha na conexão",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setTestingId(null);
      toast({
        title: "Erro no teste de conexão",
        description: error instanceof Error ? error.message : "Falha no teste",
        variant: "destructive",
      });
    }
  });

  const getProviderColor = (provider: string) => {
    // Usar cores padrão do sistema
    return 'bg-secondary text-secondary-foreground';
  };

  const handleEdit = (number: VoipNumber) => {
    setEditingNumber(number);
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja remover o número "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormComplete = () => {
    setShowAddForm(false);
    setEditingNumber(null);
    queryClient.invalidateQueries({ queryKey: ['voip-numbers'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando números...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-600">
        <AlertTriangle className="w-8 h-8 mr-2" />
        <span>Erro ao carregar números VoIP</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Números VoIP</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus números de telefone para chamadas
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Número
        </Button>
      </div>

      {/* Numbers List */}
      {voipNumbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PhoneCall className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">
              Nenhum número configurado
            </h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Adicione seus números VoIP para começar a fazer chamadas
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Número
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {voipNumbers.map((number) => (
            <Card key={number.id} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${number.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-medium text-foreground">{number.name}</h4>
                        <Badge className={getProviderColor(number.provider)}>
                          {number.provider}
                        </Badge>
                        {number.is_active ? (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-mono text-muted-foreground mb-2">
                        {number.number}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Criado: {new Date(number.created_at).toLocaleDateString('pt-BR')}</span>
                        {number.updated_at !== number.created_at && (
                          <span>Atualizado: {new Date(number.updated_at).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Test Connection */}
                    {number.provider !== 'personal' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate(number.id)}
                        disabled={testingId === number.id}
                      >
                        {testingId === number.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    {/* Active/Inactive Toggle */}
                    <Switch
                      checked={number.is_active}
                      onCheckedChange={() => toggleMutation.mutate(number.id)}
                      disabled={toggleMutation.isPending}
                    />
                    
                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(number)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(number.id, number.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Number Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Número VoIP</DialogTitle>
            <DialogDescription>
              Configure um novo número para fazer chamadas
            </DialogDescription>
          </DialogHeader>
          <VoipNumberForm onComplete={handleFormComplete} />
        </DialogContent>
      </Dialog>

      {/* Edit Number Dialog */}
      <Dialog open={!!editingNumber} onOpenChange={() => setEditingNumber(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Número VoIP</DialogTitle>
            <DialogDescription>
              Atualize as informações do número
            </DialogDescription>
          </DialogHeader>
          {editingNumber && (
            <VoipNumberForm 
              initialData={editingNumber} 
              onComplete={handleFormComplete} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
