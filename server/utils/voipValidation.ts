/**
 * VoIP Number Validation and Utility Functions
 */

interface PhoneNumberInfo {
  isValid: boolean;
  country?: string;
  type?: 'mobile' | 'landline' | 'voip' | 'unknown';
  formatted?: string;
}

/**
 * Validate E.164 phone number format
 */
export function validateE164(phoneNumber: string): boolean {
  // E.164 format: +[1-9]\d{1,14}
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Get detailed phone number information
 */
export function getPhoneNumberInfo(phoneNumber: string): PhoneNumberInfo {
  if (!validateE164(phoneNumber)) {
    return { isValid: false };
  }

  // Extract country code and number
  const countryInfo = getCountryFromNumber(phoneNumber);
  
  return {
    isValid: true,
    country: countryInfo.country,
    type: countryInfo.type,
    formatted: formatPhoneNumber(phoneNumber, countryInfo.country)
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string, country?: string): string {
  if (!validateE164(phoneNumber)) {
    return phoneNumber;
  }

  // Remove + and get digits
  const digits = phoneNumber.slice(1);
  
  // Format based on country
  switch (country) {
    case 'US':
    case 'CA':
      // +1 (XXX) XXX-XXXX
      if (digits.length === 11 && digits.startsWith('1')) {
        const areaCode = digits.slice(1, 4);
        const exchange = digits.slice(4, 7);
        const number = digits.slice(7);
        return `+1 (${areaCode}) ${exchange}-${number}`;
      }
      break;
      
    case 'BR':
      // +55 (XX) XXXXX-XXXX or +55 (XX) XXXX-XXXX
      if (digits.length >= 12 && digits.startsWith('55')) {
        const areaCode = digits.slice(2, 4);
        const firstPart = digits.slice(4, -4);
        const secondPart = digits.slice(-4);
        return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
      }
      break;
  }

  // Default formatting
  return phoneNumber;
}

/**
 * Get country information from phone number
 */
function getCountryFromNumber(phoneNumber: string): { country: string; type: 'mobile' | 'landline' | 'voip' | 'unknown' } {
  const digits = phoneNumber.slice(1); // Remove +
  
  // US/Canada (+1)
  if (digits.startsWith('1') && digits.length === 11) {
    const areaCode = digits.slice(1, 4);
    const exchange = digits.slice(4, 7);
    
    // Some common patterns
    if (['800', '844', '855', '866', '877', '888'].includes(areaCode)) {
      return { country: 'US', type: 'voip' };
    }
    
    // Mobile vs landline detection (simplified)
    const firstDigit = parseInt(exchange[0]);
    const type = firstDigit >= 2 && firstDigit <= 9 ? 'mobile' : 'landline';
    
    return { country: 'US', type };
  }
  
  // Brazil (+55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const areaCode = digits.slice(2, 4);
    const firstDigit = digits[4];
    
    // Mobile numbers start with 9
    const type = firstDigit === '9' ? 'mobile' : 'landline';
    
    return { country: 'BR', type };
  }
  
  // UK (+44)
  if (digits.startsWith('44')) {
    return { country: 'UK', type: 'unknown' };
  }
  
  // Default
  return { country: 'unknown', type: 'unknown' };
}

/**
 * Validate VoIP provider configuration
 */
export function validateProviderConfig(provider: string, config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  switch (provider) {
    case 'voipms':
      if (!config.account_id || !config.account_id.includes('@')) {
        errors.push('Voip.ms requer email como usuário');
      }
      if (!config.password || config.password.length < 8) {
        errors.push('Senha deve ter pelo menos 8 caracteres');
      }
      if (!config.server) {
        config.server = 'sip.voip.ms';
      }
      break;
      
    case 'sip2dial':
      if (!config.password || !config.password.startsWith('sk_')) {
        errors.push('SIP2Dial requer API key válida (começa com sk_)');
      }
      if (!config.server) {
        config.server = 'sip.sip2dial.com';
      }
      break;
      
    case 'vonage':
      if (!config.password || config.password.length < 32) {
        errors.push('Vonage requer JWT token válido');
      }
      if (!config.server) {
        config.server = 'api.vonage.com';
      }
      break;
      
    case 'personal':
      // Personal numbers don't need validation
      break;
      
    default:
      errors.push(`Provedor ${provider} não é suportado`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate test call configuration for provider testing
 */
export function generateTestCallConfig(provider: string): { testNumber: string; expectedDuration: number } {
  switch (provider) {
    case 'voipms':
      // Voip.ms test number (should not actually place call)
      return { testNumber: '+15551234567', expectedDuration: 0 };
      
    case 'sip2dial':
      // SIP2Dial test number
      return { testNumber: '+15551234567', expectedDuration: 0 };
      
    case 'vonage':
      // Vonage test number  
      return { testNumber: '+15551234567', expectedDuration: 0 };
      
    default:
      return { testNumber: '+15551234567', expectedDuration: 0 };
  }
}

/**
 * Estimate call cost based on destination
 */
export function estimateCallCost(from: string, to: string, durationMinutes: number = 1): number {
  const fromCountry = getCountryFromNumber(from).country;
  const toCountry = getCountryFromNumber(to).country;
  
  // Simplified cost estimation (cents per minute)
  let costPerMinute = 0.02; // Default 2 cents
  
  // Domestic calls are usually cheaper
  if (fromCountry === toCountry) {
    costPerMinute = 0.01;
  }
  
  // International rates vary
  if (fromCountry === 'US' && toCountry === 'BR') {
    costPerMinute = 0.05;
  } else if (fromCountry === 'BR' && toCountry === 'US') {
    costPerMinute = 0.08;
  }
  
  return costPerMinute * durationMinutes;
}

/**
 * Check if number supports SMS
 */
export function supportsSMS(phoneNumber: string): boolean {
  const info = getPhoneNumberInfo(phoneNumber);
  return info.isValid && (info.type === 'mobile' || info.type === 'voip');
}

/**
 * Get recommended provider for a phone number
 */
export function getRecommendedProvider(phoneNumber: string): string[] {
  const info = getPhoneNumberInfo(phoneNumber);
  
  if (!info.isValid) {
    return [];
  }
  
  const recommendations: string[] = [];
  
  switch (info.country) {
    case 'US':
    case 'CA':
      recommendations.push('voipms', 'vonage', 'sip2dial');
      break;
      
    case 'BR':
      recommendations.push('sip2dial', 'vonage');
      break;
      
    default:
      recommendations.push('vonage', 'sip2dial');
  }
  
  return recommendations;
}
