import { queries } from '../database';
import { FaleVonoProviderImpl } from './faleVonoProvider';

export interface VoIPNumberRecord {
  id: number;
  name: string;
  number: string;
  provider: string;
  account_id: string | null; // username
  server: string | null;     // sip server
  is_active: number;         // 1 or 0
}

export class ProviderFactory {
  static createProvider(voipNumber: VoIPNumberRecord) {
    console.log(`[PROVIDER_FACTORY] Creating provider for ${voipNumber.name} (${voipNumber.provider})`);

    const prov = (voipNumber.provider || '').toLowerCase();
    if (prov !== 'falevono' && prov !== 'sobreip') {
      throw new Error(`Provedor não suportado: ${voipNumber.provider}. Suportados: FaleVono, SobreIP.`);
    }

    if (!voipNumber.account_id || !voipNumber.server) {
      throw new Error('Configuração SIP incompleta: faltam username (account_id) ou servidor');
    }

    // SECURITY: Password must come from environment variable (compartilhado para ambos provedores)
    if (!process.env.FALEVONO_PASSWORD) {
      throw new Error('FALEVONO_PASSWORD environment variable not configured');
    }

    // Return FaleVono provider instance
    return new FaleVonoProviderImpl(
      voipNumber.account_id,
      voipNumber.number,
      voipNumber.server,
      5060
    );
  }

  static getDefaultNumber(): VoIPNumberRecord | null {
    try {
      const row = queries.getSetting.get('DEFAULT_VOIP_NUMBER_ID') as { value?: string } | undefined;
      const defaultId = row?.value ? parseInt(String(row.value), 10) : undefined;
      if (defaultId && !Number.isNaN(defaultId)) {
        const n = queries.getVoipNumber.get(defaultId) as any;
        if (n) return n as VoIPNumberRecord;
      }
      const list = (queries.getActiveVoipNumbers.all() as any[]) || [];
      return (list[0] as VoIPNumberRecord) || null;
    } catch (error) {
      console.error('[PROVIDER_FACTORY] Error getting default number:', error);
      return null;
    }
  }

  static getNumberById(id: number): VoIPNumberRecord | null {
    try {
      const number = queries.getVoipNumber.get(id) as VoIPNumberRecord | undefined;
      return number || null;
    } catch (error) {
      console.error('[PROVIDER_FACTORY] Error getting number by id:', error);
      return null;
    }
  }

  static getNumberByNumber(phoneNumber: string): VoIPNumberRecord | null {
    try {
      const number = queries.getVoipNumberByNumber.get(phoneNumber) as VoIPNumberRecord | undefined;
      return number || null;
    } catch (error) {
      console.error('[PROVIDER_FACTORY] Error getting number by phone:', error);
      return null;
    }
  }

  static getProviderForCall(numberId?: number): { provider: any; voipNumber: VoIPNumberRecord } {
    let voipNumber: VoIPNumberRecord | null = null;

    if (numberId) {
      voipNumber = this.getNumberById(numberId);
    }

    if (!voipNumber) {
      voipNumber = this.getDefaultNumber();
    }

    if (!voipNumber) {
      throw new Error('Nenhum número VoIP configurado. Por favor, cadastre um número primeiro.');
    }

    if (!voipNumber.is_active) {
      throw new Error(`O número ${voipNumber.name} está inativo`);
    }

    const provider = this.createProvider(voipNumber);
    
    return { provider, voipNumber };
  }
}
