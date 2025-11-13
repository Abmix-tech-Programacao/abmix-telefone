export const validateE164 = (phoneNumber: string): boolean => {
  // E.164 format: +[country code][number] OR Brazilian numbers without +55
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const brazilianRegex = /^[1-9]\d{9,10}$/; // 10 or 11 digits for Brazil
  
  return e164Regex.test(phoneNumber) || brazilianRegex.test(phoneNumber);
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it's a Brazilian number without country code, add +55
  if (!cleaned.startsWith('+')) {
    if (/^[1-9]\d{9,10}$/.test(cleaned)) {
      cleaned = '+55' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
};

export const isDTMFTone = (tone: string): boolean => {
  return /^[0-9*#]$/.test(tone);
};
