/** Saved text when the member selects “No health concerns”. */
export const HEALTH_NO_CONCERNS_TEXT = 'No health concerns.';

/** Maximum characters for the “Yes, specify” free-text disclosure. */
export const MAX_HEALTH_CONCERNS_CHARS = 500;

export const HEALTH_DOCUMENT_MAX_BYTES = 1024 * 1024;

export const HEALTH_DOCUMENT_TOO_LARGE_MESSAGE =
  'Your file is too large to upload here. Please email it to mudit@andweyoga.com and our team will update your record.';

export type HealthDisclosureChoice = 'none' | 'concerns' | '';

const LEGACY_NO_CONCERNS_PHRASES = new Set([
  'no current concerns',
  'no health concerns',
  'none',
]);

export function isNoHealthConcernsText(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (trimmed === HEALTH_NO_CONCERNS_TEXT) return true;
  return LEGACY_NO_CONCERNS_PHRASES.has(trimmed.toLowerCase());
}

export function isHealthConcernsTextComplete(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed || isNoHealthConcernsText(trimmed)) return false;
  return trimmed.length <= MAX_HEALTH_CONCERNS_CHARS;
}

/** Whether saved health text satisfies profile / booking requirements. */
export function isHealthDisclosureComplete(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return false;
  if (isNoHealthConcernsText(trimmed)) return true;
  return isHealthConcernsTextComplete(trimmed);
}

export function deriveHealthDisclosureChoice(
  text: string | null | undefined,
): HealthDisclosureChoice {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  if (isNoHealthConcernsText(trimmed)) return 'none';
  return 'concerns';
}

export type ConfirmedHealthState = {
  choice: HealthDisclosureChoice | '';
  concernsText: string;
  documentUrls: string[];
};

export function confirmedHealthFromSavedText(
  healthUpdateText: string | null | undefined,
  healthDocumentUrls: string[] | null | undefined = [],
): ConfirmedHealthState {
  const trimmed = (healthUpdateText ?? '').trim();
  const documentUrls = healthDocumentUrls ?? [];
  if (!trimmed) {
    return { choice: '', concernsText: '', documentUrls };
  }
  if (isNoHealthConcernsText(trimmed)) {
    return { choice: 'none', concernsText: '', documentUrls };
  }
  return { choice: 'concerns', concernsText: trimmed, documentUrls };
}

export function confirmedHealthToUpdateText(state: ConfirmedHealthState): string {
  if (state.choice === 'none') return HEALTH_NO_CONCERNS_TEXT;
  if (state.choice === 'concerns') return state.concernsText.trim();
  return '';
}

export function validateHealthDisclosureDraft(
  choice: HealthDisclosureChoice,
  text: string,
): { valid: boolean; message?: string } {
  if (!choice) {
    return { valid: false, message: 'Please select a health disclosure option.' };
  }
  if (choice === 'none') {
    return { valid: true };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, message: 'Please describe your health concerns.' };
  }
  if (trimmed.length > MAX_HEALTH_CONCERNS_CHARS) {
    return {
      valid: false,
      message: `Health concerns must be ${MAX_HEALTH_CONCERNS_CHARS} characters or fewer.`,
    };
  }
  return { valid: true };
}

const ALLOWED_DISCLOSURE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const ALLOWED_DISCLOSURE_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export function isAllowedHealthDisclosureFile(file: File): boolean {
  const ext = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
    : '';
  if (ALLOWED_DISCLOSURE_MIMES.has(file.type)) return true;
  if (ALLOWED_DISCLOSURE_EXTENSIONS.has(ext)) {
    return !file.type || file.type === 'application/octet-stream' || ALLOWED_DISCLOSURE_MIMES.has(file.type);
  }
  return false;
}
