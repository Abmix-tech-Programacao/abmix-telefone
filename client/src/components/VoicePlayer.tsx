import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Play, Pause, Volume2, User, Users } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  labels: {
    gender: string;
    accent: string;
    age: string;
    descriptive: string;
    language: string;
  };
  description: string;
  preview_url: string;
}

export function VoicePlayer() {
  const { toast } = useToast();
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [customText, setCustomText] = useState('Olá, esta é uma demonstração da voz em português.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');

  // Fetch voices from ElevenLabs
  const { data: voices, isLoading } = useQuery({
    queryKey: ['/api/voices'],
    queryFn: api.getVoices
  });

  const filteredVoices = voices?.filter((voice: Voice) => {
    if (filter === 'male') return voice.labels.gender === 'male';
    if (filter === 'female') return voice.labels.gender === 'female';
    return true;
  }) || [];

  const playVoice = async (voiceId: string, text?: string) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      setIsPlaying(true);
      
      // Generate voice preview
      const audioBlob = await api.previewVoice(voiceId, text || customText);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Erro de Reprodução",
          description: "Não foi possível reproduzir o áudio",
          variant: "destructive"
        });
      };

      await audio.play();
      
      toast({
        title: "Reproduzindo Voz",
        description: `Testando voz: ${voices?.find((v: Voice) => v.voice_id === voiceId)?.name}`,
      });

    } catch (error) {
      console.error('Error playing voice:', error);
      setIsPlaying(false);
      toast({
        title: "Erro",
        description: "Falha ao gerar preview da voz",
        variant: "destructive"
      });
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando Vozes...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#10B981]" />
            Teste de Vozes ElevenLabs
          </CardTitle>
          <CardDescription>
            Ouça previews das vozes disponíveis e escolha a melhor para seu sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              <Users className="w-4 h-4 mr-2" />
              Todas ({voices?.length || 0})
            </Button>
            <Button
              variant={filter === 'male' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('male')}
            >
              <User className="w-4 h-4 mr-2" />
              Masculinas ({voices?.filter((v: Voice) => v.labels.gender === 'male').length || 0})
            </Button>
            <Button
              variant={filter === 'female' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('female')}
            >
              <User className="w-4 h-4 mr-2" />
              Femininas ({voices?.filter((v: Voice) => v.labels.gender === 'female').length || 0})
            </Button>
          </div>

          {/* Custom text input */}
          <div className="space-y-2">
            <Label htmlFor="customText">Texto para Teste</Label>
            <Input
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Digite o texto que será falado..."
              className="font-mono text-sm"
            />
          </div>

          {/* Voice grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredVoices.map((voice: Voice) => (
              <Card key={voice.voice_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{voice.name}</h4>
                      <Badge 
                        variant="secondary"
                        className={voice.labels.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}
                      >
                        {voice.labels.gender === 'male' ? '♂️' : '♀️'} {voice.labels.gender}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {voice.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.accent}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.age}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.descriptive}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => playVoice(voice.voice_id)}
                        disabled={isPlaying}
                        className="flex-1"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            Tocando...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Testar
                          </>
                        )}
                      </Button>
                      
                      {voice.preview_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const audio = new Audio(voice.preview_url);
                            audio.play().catch(() => {
                              toast({
                                title: "Erro",
                                description: "Não foi possível reproduzir o preview original",
                                variant: "destructive"
                              });
                            });
                          }}
                          className="px-2"
                          title="Preview Original"
                        >
                          🎵
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredVoices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma voz encontrada para o filtro selecionado</p>
            </div>
          )}

          {/* Audio controls */}
          {isPlaying && (
            <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg">
              <Button
                variant="destructive"
                size="sm"
                onClick={stopAudio}
              >
                <Pause className="w-4 h-4 mr-2" />
                Parar Reprodução
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
