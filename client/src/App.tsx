import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { SetupModal } from "@/components/SetupModal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Check if setup is complete in localStorage first
        const setupComplete = localStorage.getItem('abmix_setup_complete');
        if (setupComplete === 'true') {
          setIsSetupComplete(true);
          return;
        }

        // Check backend health to see if it's already configured
        const response = await fetch('/api/health');
        const healthData = await response.json();
        
        if (healthData.status === 'healthy') {
          // Backend is configured, skip setup
          localStorage.setItem('abmix_setup_complete', 'true');
          setIsSetupComplete(true);
        } else {
          // Show setup modal
          setShowSetupModal(true);
        }
      } catch (error) {
        // If can't reach backend, show setup modal
        setShowSetupModal(true);
      }
    };

    checkSetup();
  }, []);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
    setShowSetupModal(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div>
            <SetupModal 
              isOpen={showSetupModal} 
              onComplete={handleSetupComplete}
            />
            
            {isSetupComplete && <Router />}
            
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
