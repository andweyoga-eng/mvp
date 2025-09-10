// Mobile number validation utilities

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

export function validateMobileNumber(number: string, countryCode: string): ValidationResult {
  // Remove all non-digit characters
  const cleanNumber = number.replace(/\D/g, '');
  
  // Check if number contains only digits
  if (!/^\d+$/.test(cleanNumber)) {
    return {
      isValid: false,
      error: 'Mobile number must contain only digits'
    };
  }
  
  // Find country configuration
  const country = countryCodeOptions.find(c => c.value === countryCode);
  if (!country) {
    return {
      isValid: false,
      error: 'Invalid country code'
    };
  }
  
  // Check length
  if (cleanNumber.length < country.minLength) {
    return {
      isValid: false,
      error: `Mobile number must be at least ${country.minLength} digits`
    };
  }
  
  if (cleanNumber.length > country.maxLength) {
    return {
      isValid: false,
      error: `Mobile number cannot exceed ${country.maxLength} digits`
    };
  }
  
  // Check for suspicious patterns (repeated digits)
  if (isSpammyNumber(cleanNumber)) {
    return {
      isValid: false,
      error: 'Please enter a valid mobile number'
    };
  }
  
  return { isValid: true };
}

function isSpammyNumber(number: string): boolean {
  // Check for all same digits
  if (/^(\d)\1+$/.test(number)) {
    return true;
  }
  
  // Check for sequential numbers (123456789)
  if (isSequential(number)) {
    return true;
  }
  
  // Check for common spam patterns
  const spamPatterns = [
    /^0+\d*$/, // Starting with multiple zeros
    /^1{5,}/, // Five or more 1s in a row
    /^9{5,}/, // Five or more 9s in a row
  ];
  
  return spamPatterns.some(pattern => pattern.test(number));
}

function isSequential(number: string): boolean {
  for (let i = 0; i < number.length - 2; i++) {
    const current = parseInt(number[i]);
    const next = parseInt(number[i + 1]);
    const afterNext = parseInt(number[i + 2]);
    
    // Check for 3+ consecutive ascending numbers
    if (next === current + 1 && afterNext === next + 1) {
      return true;
    }
    
    // Check for 3+ consecutive descending numbers  
    if (next === current - 1 && afterNext === next - 1) {
      return true;
    }
  }
  
  return false;
}

export function formatMobileNumber(number: string): string {
  // Remove all non-digit characters and format consistently
  return number.replace(/\D/g, '');
}