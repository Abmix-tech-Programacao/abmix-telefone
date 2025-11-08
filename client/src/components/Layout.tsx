import { 
  Sidebar,
  Header,
  DialerCard,
  AgentControls,
  LivePrompt,
  Favorites,
  Recordings,
  RecordingsTab,
  Transcripts,
  Settings
} from '.';
import { VoicesHub } from './VoicesHub';
import { DubbingTranslation } from './DubbingTranslation';
import { CallManager } from './CallManager';
import { VoIPNumbers } from './VoIPNumbers';
import { useCallStore } from '@/stores/useCallStore';
import { AudioMonitor } from './AudioMonitor';

export function Layout() {
  const { activeView } = useCallStore();

  const renderContent = () => {
    switch(activeView) {
      case 'discagem':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            <div className="space-y-6" data-testid="left-column">
              <DialerCard />
              <AgentControls />
            </div>
            <div className="flex flex-col space-y-6 h-full" data-testid="middle-column">
              <div className="flex-1">
                <LivePrompt />
              </div>
              <Favorites />
              <Recordings />
            </div>
            <div className="space-y-6" data-testid="right-column">
              <Transcripts />
            </div>
          </div>
        );
        
      case 'favoritos':
        return (
          <div className="max-w-4xl mx-auto">
            <Favorites />
          </div>
        );
        
      case 'gravacoes':
        return (
          <div className="max-w-6xl mx-auto">
            <RecordingsTab />
          </div>
        );
        
      case 'vozes':
        return (
          <div className="max-w-7xl mx-auto">
            <VoicesHub />
          </div>
        );

      case 'chamadas':
        return (
          <div className="max-w-4xl mx-auto">
            <CallManager />
          </div>
        );

      case 'configuracoes':
        return (
          <div className="max-w-4xl mx-auto">
            <Settings />
          </div>
        );

      case 'numeros':
        return (
          <div className="max-w-4xl mx-auto">
            <VoIPNumbers />
          </div>
        );
        
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            <div className="space-y-6" data-testid="left-column">
              <DialerCard />
              <AgentControls />
            </div>
            <div className="flex flex-col space-y-6 h-full" data-testid="middle-column">
              <div className="flex-1">
                <LivePrompt />
              </div>
              <Favorites />
              <Recordings />
            </div>
            <div className="space-y-6" data-testid="right-column">
              <Transcripts />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      {/* Monitor de áudio global - TEMPORARIAMENTE DESABILITADO para corrigir interface tremendo */}
      {/* <AudioMonitor /> */}
      
      <div className="flex min-h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 max-w-7xl">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
