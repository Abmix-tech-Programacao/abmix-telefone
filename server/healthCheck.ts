// Health check endpoint para verificar se as variáveis estão disponíveis no ambiente público
import { Request, Response } from 'express';

export function setupHealthCheck(app: any) {
  // Endpoint para verificar se as chaves estão configuradas
  app.get('/api/health', (req: Request, res: Response) => {
    const requiredEnvVars = [
      'ELEVENLABS_API_KEY',
      'TWILIO_ACCOUNT_SID', 
      'TWILIO_AUTH_TOKEN',
      'TWILIO_NUMBER',
      'DEEPGRAM_API_KEY'
    ];

    const envStatus: { [key: string]: boolean } = {};
    const missingVars: string[] = [];

    requiredEnvVars.forEach(envVar => {
      const isPresent = !!process.env[envVar];
      envStatus[envVar] = isPresent;
      
      if (!isPresent) {
        missingVars.push(envVar);
      }
    });

    const allPresent = missingVars.length === 0;

    res.json({
      status: allPresent ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      replit_domain: process.env.REPLIT_DEV_DOMAIN,
      missing_variables: missingVars,
      variables_status: envStatus,
      message: allPresent 
        ? 'Todas as variáveis estão configuradas' 
        : `${missingVars.length} variáveis faltando: ${missingVars.join(', ')}`
    });
  });

  // Endpoint específico para validar chaves da API
  app.post('/api/validate-keys', async (req: Request, res: Response) => {
    const results: { [key: string]: { valid: boolean; error?: string } } = {};

    // Teste ElevenLabs
    try {
      const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsKey) {
        results.elevenlabs = { valid: false, error: 'API key not found' };
      } else {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': elevenlabsKey }
        });
        results.elevenlabs = { 
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      results.elevenlabs = { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Teste Twilio
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioSid || !twilioToken) {
        results.twilio = { valid: false, error: 'Credentials not found' };
      } else {
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
          headers: { 'Authorization': `Basic ${auth}` }
        });
        results.twilio = { 
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      results.twilio = { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Teste Deepgram
    try {
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) {
        results.deepgram = { valid: false, error: 'API key not found' };
      } else {
        const response = await fetch('https://api.deepgram.com/v1/projects', {
          headers: { 'Authorization': `Token ${deepgramKey}` }
        });
        results.deepgram = { 
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      results.deepgram = { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    const allValid = Object.values(results).every(result => result.valid);

    res.json({
      status: allValid ? 'all_valid' : 'some_invalid',
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: Object.keys(results).length,
        valid: Object.values(results).filter(r => r.valid).length,
        invalid: Object.values(results).filter(r => !r.valid).length
      }
    });
  });
}