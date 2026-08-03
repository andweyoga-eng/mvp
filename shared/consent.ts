import { z } from "zod";
import { LEGAL_CONFIG, DATA_PROCESSING_DISCLOSURE } from "./legal-config";

export const CONSENT_TYPES = [
  "profile_booking",
  "terms",
  "age_declaration",
  "health_data",
  "whatsapp_contact",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_ACTIONS = ["opt_in", "opt_out"] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

export const ERASURE_STATUSES = ["pending", "completed", "cancelled"] as const;
export type ErasureStatus = (typeof ERASURE_STATUSES)[number];

/** Minimum age for account creation and guest booking (DPDPA adults-only policy). */
export const MINIMUM_AGE_YEARS = 18;

export function calculateAge(dateOfBirth: string, asOf: Date = new Date()): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return -1;
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAdult(dateOfBirth: string, asOf: Date = new Date()): boolean {
  return calculateAge(dateOfBirth, asOf) >= MINIMUM_AGE_YEARS;
}

export function isValidDateOfBirth(dateOfBirth: string): boolean {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dob <= today;
}

export const onboardingConsentSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required"),
  consentProfile: z.literal(true),
  consentTerms: z.literal(true),
  consentAge: z.literal(true),
  consentVersion: z.string().min(1).default(LEGAL_CONFIG.documentVersion),
});

export const guestBookingConsentSchema = z.object({
  guestConsentProfile: z.literal(true),
  guestConsentTerms: z.literal(true),
  guestConsentAge: z.literal(true),
  consentVersion: z.string().min(1).default(LEGAL_CONFIG.documentVersion),
});

export const accountConsentCompletionSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  consentProfile: z.boolean().optional(),
  consentTerms: z.boolean().optional(),
  consentAge: z.boolean().optional(),
  consentVersion: z.string().min(1).default(LEGAL_CONFIG.documentVersion),
});

export const healthDataConsentSchema = z.object({
  healthDataConsent: z.literal(true),
  consentVersion: z.string().min(1).default(LEGAL_CONFIG.documentVersion),
});

export const accountErasureSchema = z.object({
  confirmation: z.literal("ERASE"),
  acknowledged: z.literal(true),
});

export type ConsentCategoryStatus = {
  consentType: ConsentType;
  status: "active" | "withdrawn" | "not_given";
  lastAction: ConsentAction | null;
  lastUpdated: string | null;
  consentVersion: string | null;
};

export const REQUIRED_ACCOUNT_CONSENTS = [
  "profile_booking",
  "terms",
  "age_declaration",
] as const satisfies readonly ConsentType[];

export type ConsentRequirement = {
  requiresConsent: boolean;
  flow: "first_time" | "reconsent" | null;
  requiredTypes: ConsentType[];
  requireDateOfBirth: boolean;
};

export function buildConsentRequirement(
  categories: ConsentCategoryStatus[],
  currentVersion: string,
  hasDateOfBirth: boolean,
): ConsentRequirement {
  const required = REQUIRED_ACCOUNT_CONSENTS.map((type) =>
    categories.find((category) => category.consentType === type) ?? {
      consentType: type,
      status: "not_given" as const,
      lastAction: null,
      lastUpdated: null,
      consentVersion: null,
    },
  );

  if (required.some((category) => category.status !== "active")) {
    return {
      requiresConsent: true,
      flow: "first_time",
      requiredTypes: [...REQUIRED_ACCOUNT_CONSENTS],
      requireDateOfBirth: true,
    };
  }

  const outdated = required
    .filter((category) => category.consentVersion !== currentVersion)
    .map((category) => category.consentType);

  if (outdated.length > 0) {
    return {
      requiresConsent: true,
      flow: "reconsent",
      requiredTypes: outdated,
      requireDateOfBirth: outdated.includes("age_declaration") && !hasDateOfBirth,
    };
  }

  return {
    requiresConsent: false,
    flow: null,
    requiredTypes: [],
    requireDateOfBirth: false,
  };
}

/** UI copy from Part A handoff (Ch. 7 aligned). */
export const CONSENT_COPY = {
  en: {
    modalTitle: "Your consent matters to us",
    modalSubtitle:
      "We need a moment before creating your account. This takes under a minute.",
    reconsentTitle: "We need your consent again",
    reconsentSubtitle:
      "Our policy version has changed. Please review the updated items before continuing.",
    dobLabel: "Date of birth",
    cb1Profile: DATA_PROCESSING_DISCLOSURE.en.consentProfileProcessing,
    cb2TermsPrefix: "I have read and agree to the",
    cb2TermsLink: "Terms of Service",
    cb2And: "and",
    cb2PrivacyLink: "Privacy Notice",
    cb3Age:
      "I confirm that I am 18 years of age or older and that the date of birth I have entered is accurate.",
    trustSignal: DATA_PROCESSING_DISCLOSURE.en.consentTrustSignal,
    agreeContinue: "Agree and Continue",
    agreeFinishSetup: "Agree and finish setup",
    agreeUpdates: "Review and Continue",
    cancel: "Cancel",
    back: "Back",
    minorTitle: "This platform is for adults aged 18 and over",
    minorBody:
      "andWeYoga is available to members who are 18 or older. We're unable to create an account with the date of birth you've entered.",
    minorContactPrefix:
      "If you believe this is an error, or you're enrolling as part of a school or institutional programme, please contact our Grievance Officer:",
    returnHome: "Return to home",
    invalidDob: "Please enter a valid date of birth.",
    genericError: "Something went wrong. Please try again.",
    healthConsent:
      "I consent to andWeYoga collecting and processing the health information I share here to ensure my practice is adapted safely. I understand this is sensitive personal data and will only be shared with instructors and staff directly involved in delivering my sessions.",
    whatsappConsent:
      "Optional. I consent to andWeYoga contacting me on WhatsApp at the mobile number above for session updates, booking support, and wellness communications related to my account. I understand I can withdraw this consent at any time from My Account.",
    accountConsentTitle: "Privacy & consent (DPDPA)",
    accountConsentSubtitle:
      "Review and accept how we use your data. Required before you can book sessions.",
    marketingConsent:
      "I'd like to receive class updates, wellness tips, and occasional offers by email. (Optional, change anytime in Preferences.)",
    guestAccountRequiredTitle: "A free account is needed for this session",
    guestAccountRequiredBody:
      "Some sessions require Health History so instructors can adapt your practice safely. Please create a quick free account to continue. It takes under two minutes.",
    guestAccountRequiredCta: "Create a free account",
    guestAccountRequiredSecondary: "Choose a different session",
    guestConsentHeading: "Consent before booking",
    healthBannerTitle: "Health data consent",
    healthBannerBody:
      "Withdraw separately without closing your account. Stored Health History and documents will be deleted.",
    withdrawHealthConsent: "Withdraw health data consent",
    withdrawingHealth: "Withdrawing…",
  },
  kn: {
    modalTitle: "ನಿಮ್ಮ ಸಮ್ಮತಿ ನಮಗೆ ಮುಖ್ಯ",
    modalSubtitle:
      "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಬಳಸಲು ಮುನ್ನ ಕೆಲವು ಕಡ್ಡಾಯ ಸಮ್ಮತಿ ವಿವರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಬೇಕು. ಇದಕ್ಕೆ ಒಂದು ನಿಮಿಷಕ್ಕೂ ಕಡಿಮೆ ಸಮಯ ಬೇಕಾಗುತ್ತದೆ.",
    reconsentTitle: "ನವೀಕೃತ ಸಮ್ಮತಿ ಅಗತ್ಯವಿದೆ",
    reconsentSubtitle:
      "ನಮ್ಮ ನೀತಿ ಆವೃತ್ತಿ ಬದಲಾಗಿದೆ. ಮುಂದುವರಿಯುವ ಮೊದಲು ಬದಲಾಗಿರುವ ಅಂಶಗಳನ್ನು ಓದಿ ಒಪ್ಪಿಕೊಳ್ಳಿ.",
    dobLabel: "ಜನ್ಮ ದಿನಾಂಕ",
    cb1Profile: DATA_PROCESSING_DISCLOSURE.kn.consentProfileProcessing,
    cb2TermsPrefix: "ನಾನು ಈ ಕೆಳಗಿನ ದಾಖಲೆಗಳನ್ನು ಓದಿ ಒಪ್ಪುತ್ತೇನೆ:",
    cb2TermsLink: "ಸೇವಾ ನಿಯಮಗಳು",
    cb2And: "ಮತ್ತು",
    cb2PrivacyLink: "ಗೌಪ್ಯತಾ ಸೂಚನೆ",
    cb3Age:
      "ನಾನು ಹದಿನೆಂಟು ವರ್ಷ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು ವಯಸ್ಸಿನವನಾಗಿದ್ದೇನೆ ಅಥವಾ ವಯಸ್ಸಿನವಳಾಗಿದ್ದೇನೆ ಹಾಗೂ ನಾನು ನಮೂದಿಸಿದ ಜನ್ಮ ದಿನಾಂಕ ಸರಿಯಾಗಿದೆ ಎಂದು ದೃಢೀಕರಿಸುತ್ತೇನೆ.",
    trustSignal: DATA_PROCESSING_DISCLOSURE.kn.consentTrustSignal,
    agreeContinue: "ಒಪ್ಪಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ",
    agreeFinishSetup: "ಒಪ್ಪಿ ಮತ್ತು ಸೆಟಪ್ ಪೂರ್ಣಗೊಳಿಸಿ",
    agreeUpdates: "ನವೀಕರಿಸಿದ ಅಂಶಗಳನ್ನು ಒಪ್ಪಿ ಮುಂದುವರಿಯಿರಿ",
    cancel: "ರದ್ದು",
    back: "ಹಿಂದೆ",
    minorTitle: "ಈ ವೇದಿಕೆ ಹದಿನೆಂಟು ವರ್ಷ ಮೇಲ್ಪಟ್ಟವರಿಗಾಗಿ ಮಾತ್ರ",
    minorBody:
      "ನೀವು ನಮೂದಿಸಿದ ಜನ್ಮ ದಿನಾಂಕದ ಆಧಾರದ ಮೇಲೆ ಈ ವೇದಿಕೆಯಲ್ಲಿ ಖಾತೆ ತೆರೆಯಲು ನಮಗೆ ಸಾಧ್ಯವಿಲ್ಲ.",
    minorContactPrefix:
      "ಇದು ತಪ್ಪಾಗಿದೆ ಎಂದು ನೀವು ಭಾವಿಸಿದರೆ ಅಥವಾ ನೀವು ಶಿಕ್ಷಣ ಸಂಸ್ಥೆ ಅಥವಾ ಸಂಸ್ಥೆಯ ಕಾರ್ಯಕ್ರಮದ ಭಾಗವಾಗಿ ಸೇರುತ್ತಿದ್ದರೆ, ದಯವಿಟ್ಟು ನಮ್ಮ ದೂರು ಪರಿಹಾರಾಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ:",
    returnHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    invalidDob: "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಜನ್ಮ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ.",
    genericError: "ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    healthConsent:
      "ನನ್ನ ಅಭ್ಯಾಸವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಹೊಂದಿಸಲು ನಾನು ಇಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳುವ ಆರೋಗ್ಯ ಮಾಹಿತಿ ಮತ್ತು ದಾಖಲೆಗಳನ್ನು ಸಂಗ್ರಹಿಸಿ ಸಂಸ್ಕರಿಸಲು ಆಂಡ್‌ವೀಯೋಗಕ್ಕೆ ಸಮ್ಮತಿ ನೀಡುತ್ತೇನೆ. ಈ ಸೂಕ್ಷ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ನನ್ನ ಸೆಷನ್‌ಗಳನ್ನು ನಡೆಸುವ ಸಂಬಂಧಿತ ಶಿಕ್ಷಕರು ಮತ್ತು ಸಿಬ್ಬಂದಿಯವರೊಂದಿಗೆ ಮಾತ್ರ ಹಂಚಿಕೊಳ್ಳಲಾಗುತ್ತದೆ ಎಂಬುದು ನನಗೆ ತಿಳಿದಿದೆ.",
    whatsappConsent:
      "ಐಚ್ಛಿಕ. ನನ್ನ ಖಾತೆಗೆ ಸಂಬಂಧಿಸಿದ ಸೆಷನ್ ನವೀಕರಣಗಳು, ಬುಕ್ಕಿಂಗ್ ನೆರವು ಮತ್ತು ಕ್ಷೇಮ ಸಂವಹನಗಳಿಗಾಗಿ ಮೇಲಿನ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಲ್ಲಿ ವಾಟ್ಸಾಪ್ ಮೂಲಕ ನನ್ನನ್ನು ಸಂಪರ್ಕಿಸಲು ನಾನು ಆಂಡ್‌ವೀಯೋಗಕ್ಕೆ ಸಮ್ಮತಿ ನೀಡುತ್ತೇನೆ. ನಾನು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ನನ್ನ ಖಾತೆಯಿಂದ ಈ ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಬಹುದು ಎಂದು ನನಗೆ ತಿಳಿದಿದೆ.",
    accountConsentTitle: "ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ (DPDPA)",
    accountConsentSubtitle:
      "ನಾವು ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಬಳಸುತ್ತೇವೆ ಎಂಬುದನ್ನು ಓದಿ ಒಪ್ಪಿಕೊಳ್ಳಿ. ಸೆಷನ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಲು ಇದು ಅಗತ್ಯ.",
    marketingConsent:
      "ತರಗತಿ ನವೀಕರಣಗಳು, ಕ್ಷೇಮ ಸಲಹೆಗಳು ಮತ್ತು ಅವಕಾಶದ ಕೊಡುಗೆಗಳನ್ನು ಇಮೇಲ್ ಮೂಲಕ ಪಡೆಯಲು ನಾನು ಬಯಸುತ್ತೇನೆ. (ಐಚ್ಛಿಕ, ಆದ್ಯತೆಗಳಲ್ಲಿ ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಬದಲಾಯಿಸಬಹುದು.)",
    guestAccountRequiredTitle: "ಈ ಸೆಷನ್‌ಗೆ ಉಚಿತ ಖಾತೆ ಅಗತ್ಯ",
    guestAccountRequiredBody:
      "ಕೆಲವು ಸೆಷನ್‌ಗಳಿಗೆ ಶಿಕ್ಷಕರು ನಿಮ್ಮ ಅಭ್ಯಾಸವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಹೊಂದಿಸಲು ಆರೋಗ್ಯ ಇತಿಹಾಸ ಅಗತ್ಯವಿರುತ್ತದೆ. ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ಉಚಿತ ಖಾತೆ ರಚಿಸಿ.",
    guestAccountRequiredCta: "ಉಚಿತ ಖಾತೆಯನ್ನು ರಚಿಸಿ",
    guestAccountRequiredSecondary: "ಬೇರೆ ಸೆಷನ್ ಆಯ್ಕೆಮಾಡಿ",
    guestConsentHeading: "ಬುಕ್ಕಿಂಗ್ ಮೊದಲು ಸಮ್ಮತಿ",
    healthBannerTitle: "ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸಮ್ಮತಿ",
    healthBannerBody:
      "ಖಾತೆಯನ್ನು ಮುಚ್ಚದೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳಬಹುದು. ಸಂಗ್ರಹಿಸಿದ ಆರೋಗ್ಯ ಇತಿಹಾಸ ಮತ್ತು ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಲಾಗುತ್ತದೆ.",
    withdrawHealthConsent: "ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಿ",
    withdrawingHealth: "ಹಿಂತೆಗೆದುಕೊಳ್ಳಲಾಗುತ್ತಿದೆ…",
  },
} as const;

export type ConsentLanguage = keyof typeof CONSENT_COPY;

/** Account privacy & consent management UI (my-account privacy section). */
export const PRIVACY_UI_COPY = {
  en: {
    sectionTitle: "Privacy & Consent",
    sectionSubtitle:
      "View consent you have given and exercise your data rights under the DPDP Act, 2023.",
    categories: {
      profile_booking: "Profile & Booking Data",
      terms: "Terms of Service & Privacy Notice",
      age_declaration: "Age Declaration (18+)",
      health_data: "Health Data",
      whatsapp_contact: "WhatsApp Contact",
    },
    status: { active: "Active", withdrawn: "Withdrawn", not_given: "Not given" },
    givenOn: "Given",
    updatedOn: "Updated",
    privacyLink: "Privacy Notice, subprocessors & retention policy",
    loadError: "Could not load consent status",
    healthWithdrawn: "Health data consent withdrawn",
    healthWithdrawFailed: "Failed to withdraw health consent",
    erasureFailed: "Failed to request erasure",
    erasureDoneTitle: "Erasure requested",
    erasureDoneBody:
      "Your bookings have been cancelled. Identity and health data will be erased or anonymised within 30 days",
    erasureDoneEmail: "A confirmation email will be sent if we have your address on file.",
    returnHome: "Return to home",
    erasureSectionTitle: "Withdraw consent & erase my account",
    erasureSectionBody:
      "Core account, booking, and security data are necessary for the platform. Withdrawing consent and closing your account happen together.",
    erasureButton: "Withdraw consent & erase my account",
    erasureDialogTitle: "Confirm account erasure",
    erasureDialogBody:
      "This cancels upcoming bookings and schedules deletion of your personal data within 30 days. Type ERASE to confirm.",
    erasurePlaceholder: "Type ERASE",
    erasureAck:
      "I understand this action cannot be undone and my account will be closed.",
    erasureConfirm: "Confirm erasure",
    erasureProcessing: "Processing…",
  },
  kn: {
    sectionTitle: "ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ",
    sectionSubtitle:
      "ಡಿಜಿಟಲ್ ಪರ್ಸನಲ್ ಡೇಟಾ ಪ್ರೊಟೆಕ್ಷನ್ ಕಾಯಿದೆ, 2023 ಅಡಿಯಲ್ಲಿ ನೀವು ನೀಡಿದ ಸಮ್ಮತಿಯನ್ನು ನೋಡಿ ಮತ್ತು ನಿಮ್ಮ ಮಾಹಿತಿ ಹಕ್ಕುಗಳನ್ನು ಬಳಸಿ.",
    categories: {
      profile_booking: "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಬುಕ್ಕಿಂಗ್ ಮಾಹಿತಿ",
      terms: "ಸೇವಾ ನಿಯಮಗಳು ಮತ್ತು ಗೌಪ್ಯತಾ ಸೂಚನೆ",
      age_declaration: "ವಯಸ್ಸಿನ ದೃಢೀಕರಣ (ಹದಿನೆಂಟು ವರ್ಷ+)",
      health_data: "ಆರೋಗ್ಯ ಮಾಹಿತಿ",
      whatsapp_contact: "ವಾಟ್ಸಾಪ್ ಸಂಪರ್ಕ",
    },
    status: { active: "ಸಕ್ರಿಯ", withdrawn: "ಹಿಂತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ", not_given: "ನೀಡಲಾಗಿಲ್ಲ" },
    givenOn: "ನೀಡಿದ ದಿನಾಂಕ",
    updatedOn: "ನವೀಕರಿಸಿದ ದಿನಾಂಕ",
    privacyLink: "ಗೌಪ್ಯತಾ ಸೂಚನೆ, ಉಪಪ್ರಕ್ರಿಯೆದಾರರು ಮತ್ತು ಕಾಯ್ದಿರಿಂಪು ನೀತಿ",
    loadError: "ಸಮ್ಮತಿ ಸ್ಥಿತಿಯನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
    healthWithdrawn: "ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ",
    healthWithdrawFailed: "ಆರೋಗ್ಯ ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಲು ವಿಫಲವಾಗಿದೆ",
    erasureFailed: "ಅಳಿಸುವಿಕೆ ವಿನಂತಿಯನ್ನು ಸಲ್ಲಿಸಲು ವಿಫಲವಾಗಿದೆ",
    erasureDoneTitle: "ಅಳಿಸುವಿಕೆ ವಿನಂತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ",
    erasureDoneBody:
      "ನಿಮ್ಮ ಬುಕ್ಕಿಂಗ್‌ಗಳನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಗುರುತು ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಮுப்பತ್ತು ದಿನಗಳೊಳಗೆ ಅಳಿಸಲಾಗುತ್ತದೆ ಅಥವಾ ಗುರುತಿಸಲಾಗದಂತೆ ಅನಾಮಧೇಯಗೊಳಿಸಲಾಗುತ್ತದೆ",
    erasureDoneEmail: "ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ನಮ್ಮ ಬಳಿ ಇದ್ದರೆ ದೃಢೀಕರಣ ಇಮೇಲ್ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.",
    returnHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    erasureSectionTitle: "ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಂಡು ಖಾತೆಯನ್ನು ಅಳಿಸಿ",
    erasureSectionBody:
      "ಮೂಲ ಖಾತೆ, ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಭದ್ರತಾ ಮಾಹಿತಿ ವೇದಿಕೆಗೆ ಅಗತ್ಯ. ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವುದು ಮತ್ತು ಖಾತೆ ಮುಚ್ಚುವುದು ಒಟ್ಟಿಗೆ ನಡೆಯುತ್ತದೆ.",
    erasureButton: "ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಂಡು ಖಾತೆಯನ್ನು ಅಳಿಸಿ",
    erasureDialogTitle: "ಖಾತೆ ಅಳಿಸುವಿಕೆಯನ್ನು ದೃಢೀಕರಿಸಿ",
    erasureDialogBody:
      "ಇದು ಮುಂದಿನ ಬುಕ್ಕಿಂಗ್‌ಗಳನ್ನು ರದ್ದುಗೊಳಿಸುತ್ತದೆ ಮತ್ತು ಮுப்பತ್ತು ದಿನಗಳೊಳಗೆ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯ ಅಳಿಸುವಿಕೆಯನ್ನು ಯೋಜಿಸುತ್ತದೆ. ದೃಢೀಕರಿಸಲು ಅಳಿಸು ಎಂದು ಟೈಪ್ ಮಾಡಿ.",
    erasurePlaceholder: "ERASE ಎಂದು ಟೈಪ್ ಮಾಡಿ",
    erasureAck: "ಈ ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ ಮತ್ತು ನನ್ನ ಖಾತೆ ಮುಚ್ಚಲಾಗುತ್ತದೆ ಎಂದು ನನಗೆ ತಿಳಿದಿದೆ.",
    erasureConfirm: "ಅಳಿಸುವಿಕೆಯನ್ನು ದೃಢೀಕರಿಸಿ",
    erasureProcessing: "ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ…",
  },
} as const;
