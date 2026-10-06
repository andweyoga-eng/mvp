// Mobile number validation utilities (shared by client and server)

export interface CountryCode {
  value: string;
  label: string;
  flag: string;
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
}

export const countryCodeOptions: CountryCode[] = [
  // Major countries
  { value: '+1', label: '+1 (USA/Canada)', flag: '🇺🇸', minLength: 10, maxLength: 10 },
  { value: '+44', label: '+44 (UK)', flag: '🇬🇧', minLength: 10, maxLength: 11 },
  { value: '+91', label: '+91 (India)', flag: '🇮🇳', minLength: 10, maxLength: 10 },
  { value: '+86', label: '+86 (China)', flag: '🇨🇳', minLength: 11, maxLength: 11 },
  { value: '+81', label: '+81 (Japan)', flag: '🇯🇵', minLength: 10, maxLength: 11 },
  { value: '+49', label: '+49 (Germany)', flag: '🇩🇪', minLength: 11, maxLength: 12 },
  { value: '+33', label: '+33 (France)', flag: '🇫🇷', minLength: 9, maxLength: 10 },
  { value: '+39', label: '+39 (Italy)', flag: '🇮🇹', minLength: 9, maxLength: 11 },
  { value: '+34', label: '+34 (Spain)', flag: '🇪🇸', minLength: 9, maxLength: 9 },
  { value: '+7', label: '+7 (Russia)', flag: '🇷🇺', minLength: 10, maxLength: 10 },

  // Asia Pacific
  { value: '+61', label: '+61 (Australia)', flag: '🇦🇺', minLength: 9, maxLength: 9 },
  { value: '+82', label: '+82 (South Korea)', flag: '🇰🇷', minLength: 9, maxLength: 11 },
  { value: '+65', label: '+65 (Singapore)', flag: '🇸🇬', minLength: 8, maxLength: 8 },
  { value: '+66', label: '+66 (Thailand)', flag: '🇹🇭', minLength: 9, maxLength: 9 },
  { value: '+60', label: '+60 (Malaysia)', flag: '🇲🇾', minLength: 9, maxLength: 10 },
  { value: '+62', label: '+62 (Indonesia)', flag: '🇮🇩', minLength: 9, maxLength: 13 },
  { value: '+63', label: '+63 (Philippines)', flag: '🇵🇭', minLength: 10, maxLength: 10 },
  { value: '+84', label: '+84 (Vietnam)', flag: '🇻🇳', minLength: 9, maxLength: 10 },
  { value: '+880', label: '+880 (Bangladesh)', flag: '🇧🇩', minLength: 10, maxLength: 10 },
  { value: '+94', label: '+94 (Sri Lanka)', flag: '🇱🇰', minLength: 9, maxLength: 9 },
  { value: '+977', label: '+977 (Nepal)', flag: '🇳🇵', minLength: 10, maxLength: 10 },
  { value: '+92', label: '+92 (Pakistan)', flag: '🇵🇰', minLength: 10, maxLength: 10 },

  // Middle East
  { value: '+971', label: '+971 (UAE)', flag: '🇦🇪', minLength: 9, maxLength: 9 },
  { value: '+966', label: '+966 (Saudi Arabia)', flag: '🇸🇦', minLength: 9, maxLength: 9 },
  { value: '+974', label: '+974 (Qatar)', flag: '🇶🇦', minLength: 8, maxLength: 8 },
  { value: '+973', label: '+973 (Bahrain)', flag: '🇧🇭', minLength: 8, maxLength: 8 },
  { value: '+965', label: '+965 (Kuwait)', flag: '🇰🇼', minLength: 8, maxLength: 8 },
  { value: '+968', label: '+968 (Oman)', flag: '🇴🇲', minLength: 8, maxLength: 8 },
  { value: '+972', label: '+972 (Israel)', flag: '🇮🇱', minLength: 9, maxLength: 9 },
  { value: '+90', label: '+90 (Turkey)', flag: '🇹🇷', minLength: 10, maxLength: 10 },

  // Europe
  { value: '+31', label: '+31 (Netherlands)', flag: '🇳🇱', minLength: 9, maxLength: 9 },
  { value: '+46', label: '+46 (Sweden)', flag: '🇸🇪', minLength: 9, maxLength: 9 },
  { value: '+47', label: '+47 (Norway)', flag: '🇳🇴', minLength: 8, maxLength: 8 },
  { value: '+45', label: '+45 (Denmark)', flag: '🇩🇰', minLength: 8, maxLength: 8 },
  { value: '+41', label: '+41 (Switzerland)', flag: '🇨🇭', minLength: 9, maxLength: 9 },
  { value: '+43', label: '+43 (Austria)', flag: '🇦🇹', minLength: 10, maxLength: 11 },
  { value: '+32', label: '+32 (Belgium)', flag: '🇧🇪', minLength: 9, maxLength: 9 },
  { value: '+48', label: '+48 (Poland)', flag: '🇵🇱', minLength: 9, maxLength: 9 },
  { value: '+420', label: '+420 (Czech Republic)', flag: '🇨🇿', minLength: 9, maxLength: 9 },

  // Americas
  { value: '+55', label: '+55 (Brazil)', flag: '🇧🇷', minLength: 10, maxLength: 11 },
  { value: '+52', label: '+52 (Mexico)', flag: '🇲🇽', minLength: 10, maxLength: 10 },
  { value: '+54', label: '+54 (Argentina)', flag: '🇦🇷', minLength: 10, maxLength: 11 },
  { value: '+56', label: '+56 (Chile)', flag: '🇨🇱', minLength: 9, maxLength: 9 },
  { value: '+57', label: '+57 (Colombia)', flag: '🇨🇴', minLength: 10, maxLength: 10 },
  { value: '+51', label: '+51 (Peru)', flag: '🇵🇪', minLength: 9, maxLength: 9 },

  // Africa
  { value: '+27', label: '+27 (South Africa)', flag: '🇿🇦', minLength: 9, maxLength: 9 },
  { value: '+234', label: '+234 (Nigeria)', flag: '🇳🇬', minLength: 10, maxLength: 10 },
  { value: '+254', label: '+254 (Kenya)', flag: '🇰🇪', minLength: 9, maxLength: 9 },
  { value: '+20', label: '+20 (Egypt)', flag: '🇪🇬', minLength: 10, maxLength: 10 },
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateMobileNumber(number: string, _countryCode: string): ValidationResult {
  const cleanNumber = number.replace(/\D/g, '');

  if (!/^\d+$/.test(cleanNumber)) {
    return {
      isValid: false,
      error: 'Mobile number must contain only digits',
    };
  }

  if (cleanNumber.length > 10) {
    return {
      isValid: false,
      error: 'Max 10 digits are allowed',
    };
  }

  if (cleanNumber.length === 0) {
    return { isValid: true };
  }

  if (cleanNumber.length < 10) {
    return {
      isValid: false,
      error: 'Mobile number must be 10 digits',
    };
  }

  if (isSpammyNumber(cleanNumber)) {
    return {
      isValid: false,
      error: 'Please enter a valid mobile number',
    };
  }

  return { isValid: true };
}

function isSpammyNumber(number: string): boolean {
  if (/^(\d)\1+$/.test(number)) {
    return true;
  }

  const spamPatterns = [/^0+\d*$/, /^1{5,}/, /^9{5,}/];

  return spamPatterns.some((pattern) => pattern.test(number));
}

export function formatMobileNumber(number: string): string {
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber.slice(0, 10);
}

/** Country code + digits key for uniqueness checks across profile phone fields. */
export function normalizeMobileKey(
  digits: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  const d = (digits ?? '').replace(/\D/g, '');
  if (!d) return '';
  const cc = (countryCode ?? '+91').trim() || '+91';
  return `${cc}:${d}`;
}

export type ProfileMobileFields = {
  primaryMobile?: string | null;
  primaryMobileCountryCode?: string | null;
  emergencyMobile?: string | null;
  emergencyMobileCountryCode?: string | null;
  secondaryMobile?: string | null;
  secondaryMobileCountryCode?: string | null;
};

export type ProfileMobileFieldName =
  | 'primaryMobile'
  | 'emergencyMobile'
  | 'secondaryMobile';

export const MOBILE_UNIQUENESS_MESSAGES = {
  emergencyVsPrimary:
    'Emergency number must be different from your mobile so we can reach someone else if needed.',
  primaryVsEmergency:
    'Mobile number must be different from your emergency contact.',
  alternateVsPrimary:
    'Alternate number must be different from your mobile number.',
  alternateVsEmergency:
    'Alternate number must be different from your emergency number.',
} as const;

/** Field-level uniqueness error, or null when the field is empty/unique. */
export function getMobileUniquenessError(
  field: ProfileMobileFieldName,
  values: ProfileMobileFields,
): string | null {
  const primary = normalizeMobileKey(values.primaryMobile, values.primaryMobileCountryCode);
  const emergency = normalizeMobileKey(
    values.emergencyMobile,
    values.emergencyMobileCountryCode,
  );
  const secondary = normalizeMobileKey(
    values.secondaryMobile,
    values.secondaryMobileCountryCode,
  );

  if (field === 'primaryMobile') {
    if (!primary) return null;
    if (emergency && primary === emergency) {
      return MOBILE_UNIQUENESS_MESSAGES.primaryVsEmergency;
    }
    return null;
  }

  if (field === 'emergencyMobile') {
    if (!emergency) return null;
    if (primary && emergency === primary) {
      return MOBILE_UNIQUENESS_MESSAGES.emergencyVsPrimary;
    }
    return null;
  }

  if (!secondary) return null;
  if (primary && secondary === primary) {
    return MOBILE_UNIQUENESS_MESSAGES.alternateVsPrimary;
  }
  if (emergency && secondary === emergency) {
    return MOBILE_UNIQUENESS_MESSAGES.alternateVsEmergency;
  }
  return null;
}

/** First uniqueness conflict across the set (for server / submit blockers). */
export function getFirstMobileUniquenessError(
  values: ProfileMobileFields,
): string | null {
  return (
    getMobileUniquenessError('emergencyMobile', values) ??
    getMobileUniquenessError('primaryMobile', values) ??
    getMobileUniquenessError('secondaryMobile', values)
  );
}

