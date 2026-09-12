/**
 * Single source of truth for legal/compliance placeholders (BE-7).
 * Consumed by server routes, legal pages, and consent UI — never hardcode these per screen.
 */
export const LEGAL_CONFIG = {
  companyLegalName: "Ashtanga Welltech OPC Pvt Ltd",
  brandName: "andWeYoga",
  platformUrl: "https://andweyoga.com",
  cin: "U86900KA2024OPC189315",
  registeredOffice: {
    line1: "ASHTANGA WELLTECH (OPC) PRIVATE LIMITED",
    line2: "No.221 Second Floor SV, Meadows Apartment, Kodipal, Kengeri",
    line3: "Bangalore South, Bangalore Rural - 560060, Karnataka, India",
  },
  grievanceOfficer: {
    name: "Arun Sachidanandamurthy",
    designation: "Data Protection and Grievance Officer",
    email: "arun@andweyoga.com",
  },
  generalContactEmail: "arun@andweyoga.com",
  gstin: null as string | null,
  documentVersion: "v1.1.0_2026-07-06",
  lastUpdated: "6 July 2026",
  lastUpdatedIso: "2026-07-06",
  dataProtectionBoard: {
    name: "Data Protection Board of India",
    note: "You may escalate unresolved grievances to the Data Protection Board of India, or to the appropriate consumer forum under the Consumer Protection Act, 2019.",
  },
  emergencyNumbers: {
    national: "112",
    ambulance: "102 / 108",
  },
  responseStandard: {
    acknowledgmentHours: 48,
    resolutionDays: 30,
    statutoryMaxDays: 90,
  },
  /** Member-facing customer care (see shared/support.ts for tel/sms/whatsapp hrefs). */
  customerCare: {
    email: "mudit@andweyoga.com",
    phone: "+91 9513022331",
    hours: "Mon-Sat, 9:30 AM-1:30 PM & 3:30 PM-5:30 PM IST",
  },
} as const;

export type LegalLanguage = "en" | "kn";

/** Subprocessors that process personal data on our instructions (interim Railway hosting disclosed). */
export const SUBPROCESSOR_SCHEDULE = [
  {
    name: "Railway Corp.",
    role: {
      en: "Cloud platform hosting the andWeYoga application and managed PostgreSQL database",
      kn: "ಆಂಡ್‌ವೀಯೋಗ ಅಪ್ಲಿಕೇಶನ್ ಮತ್ತು ನಿರ್ವಹಿಸಿದ PostgreSQL ಡೇಟಾಬೇಸ್ ಹೋಸ್ಟಿಂಗ್",
    },
    location: {
      en: "United States (interim primary hosting and data-at-rest location)",
      kn: "ಅಮೆರಿಕಾ ಸಂಯುಕ್ತ ಸಂಸ್ಥಾನ (ಇಂಟರಿಮ್ ಅವಧಿಯಲ್ಲಿ ಪ್ರಾಥಮಿಕ ಹೋಸ್ಟಿಂಗ್ ಮತ್ತು ವಿಶ್ರಾಂತಿ ಸ್ಥಿತಿಯಲ್ಲಿನ ಡೇಟಾ)",
    },
    website: "https://railway.com",
  },
  {
    name: "Razorpay Software Private Limited",
    role: {
      en: "Payment processing for bookings (cards, UPI, net banking)",
      kn: "ಬುಕ್ಕಿಂಗ್ ಪಾವತಿ ಪ್ರಕ್ರಿಯೆ (ಕಾರ್ಡ್, ಯುಪಿಐ, ನೆಟ್‌ಬ್ಯಾಂಕಿಂಗ್)",
    },
    location: {
      en: "India",
      kn: "ಭಾರತ",
    },
    website: "https://razorpay.com",
  },
  {
    name: "Google LLC",
    role: {
      en: "Sign-in (Google OAuth) and transactional email delivery (Google Workspace / Gmail SMTP)",
      kn: "ಸೈನ್-ಇನ್ (Google OAuth) ಮತ್ತು ವಹಿವಾಟು ಇಮೇಲ್ ವಿತರಣೆ (Google Workspace / Gmail SMTP)",
    },
    location: {
      en: "United States and global infrastructure (authentication and email metadata may be processed outside India)",
      kn: "ಅಮೆರಿಕಾ ಸಂಯುಕ್ತ ಸಂಸ್ಥಾನ ಮತ್ತು ಜಾಗತಿಕ ಮೂಲಸೌಕರ್ಯ (ದೃಢೀಕರಣ ಮತ್ತು ಇಮೇಲ್ ಮೆಟಾಡೇಟಾ ಭಾರತದ ಹೊರಗೆ ಸಂಸ್ಕರಿಸಲಾಗಬಹುದು)",
    },
    website: "https://policies.google.com/privacy",
  },
] as const;

export type SubprocessorEntry = (typeof SUBPROCESSOR_SCHEDULE)[number];

/**
 * Interim data-hosting and consent disclosures — single source for Privacy Notice and consent UI.
 * Update here when migration to India-located infrastructure is complete.
 */
export const DATA_PROCESSING_DISCLOSURE = {
  en: {
    localisationInterim: `${LEGAL_CONFIG.companyLegalName} processes personal data as an Indian company under the Digital Personal Data Protection Act, 2023. During an interim period, the ${LEGAL_CONFIG.brandName} application and its primary database are hosted by Railway Corp. on cloud infrastructure in the United States. Account, booking, health, and related personal data may therefore be stored and processed outside India until we complete a planned migration to infrastructure located within the Republic of India. We use contractual and technical safeguards with our subprocessors and limit access to what is necessary to operate the platform.`,
    migrationCommitment:
      "We are preparing to migrate application hosting and primary database storage to infrastructure located within the Republic of India. We will update this Privacy Notice and the subprocessor schedule below when that migration is complete.",
    retention:
      "Identity, booking, and health data tied to an active account are kept while your account is active. On account closure, identity and health data are erased or irreversibly anonymised within 30 days, except where a specific legal retention requirement applies (processing logs for at least one year under DPDP Rules; financial records as required under Indian tax and company law).",
    noMarketingShare:
      "We do not share, sell, rent, license, or trade your personal data, booking history, health data, or wellness preferences with third-party marketing networks, analytics providers, or advertisers.",
    subprocessorShare:
      "Where personal data is shared with subprocessors acting on our instructions, including Railway Corp. (interim hosting), Razorpay (payments), and Google (sign-in and email), that sharing is limited to what is necessary for each subprocessor to perform its function. See the subprocessor schedule in our Privacy Notice.",
    consentProfileProcessing: `I consent to ${LEGAL_CONFIG.brandName} collecting and processing my name, email address, contact number, date of birth, and booking history to create and manage my account, arrange sessions I book, and provide related support and communications. Data is processed by ${LEGAL_CONFIG.companyLegalName} under the DPDP Act, 2023. During an interim period, hosting is provided by subprocessors listed in our Privacy Notice (including Railway Corp. in the United States) until we complete a planned migration to India-located infrastructure.`,
    consentTrustSignal: `${LEGAL_CONFIG.brandName} does not sell or share your personal data with third parties for marketing. Our Privacy Notice lists subprocessors, including Railway Corp., Razorpay, and Google, that help us operate the platform.`,
  },
  kn: {
    localisationInterim: `${LEGAL_CONFIG.companyLegalName} ಡಿಜಿಟಲ್ ಪರ್ಸನಲ್ ಡೇಟಾ ಪ್ರೊಟೆಕ್ಷನ್ ಕಾಯಿದೆ, 2023 ಅಡಿಯಲ್ಲಿ ಭಾರತೀಯ ಕಂಪನಿಯಾಗಿ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಸಂಸ್ಕರಿಸುತ್ತದೆ. ಇಂಟರಿಮ್ ಅವಧಿಯಲ್ಲಿ, ${LEGAL_CONFIG.brandName} ಅಪ್ಲಿಕೇಶನ್ ಮತ್ತು ಅದರ ಪ್ರಾಥಮಿಕ ಡೇಟಾಬೇಸ್ ಅನ್ನು Railway Corp. ಅಮೆರಿಕಾ ಸಂಯುಕ್ತ ಸಂಸ್ಥಾನದಲ್ಲಿರುವ ಕ್ಲೌಡ್ ಮೂಲಸೌಕರ್ಯದಲ್ಲಿ ಹೋಸ್ಟ್ ಮಾಡುತ್ತದೆ. ಆದ್ದರಿಂದ ಖಾತೆ, ಬುಕ್ಕಿಂಗ್, ಆರೋಗ್ಯ ಮತ್ತು ಸಂಬಂಧಿತ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಭಾರತದ ಹೊರಗೆ ಸಂಗ್ರಹಿಸಲಾಗಬಹುದು ಮತ್ತು ಸಂಸ್ಕರಿಸಲಾಗಬಹುದು, ನಾವು ಭಾರತ ಗಣರಾಜ್ಯದಲ್ಲಿರುವ ಮೂಲಸೌಕರ್ಯಕ್ಕೆ ಯೋಜಿತ ಸ್ಥಳಾಂತರವನ್ನು ಪೂರ್ಣಗೊಳಿಸುವವರೆಗೆ. ನಾವು ಉಪಪ್ರಕ್ರಿಯೆದಾರರೊಂದಿಗೆ ಒಪ್ಪಂದ ಮತ್ತು ತಾಂತ್ರಿಕ ರಕ್ಷಣೆಗಳನ್ನು ಬಳಸುತ್ತೇವೆ ಮತ್ತು ವೇದಿಕೆಯನ್ನು ನಡೆಸಲು ಅಗತ್ಯವಿರುವ ಮಟ್ಟಿಗೆ ಮಾತ್ರ ಪ್ರವೇಶವನ್ನು ಮಿತಿಗೊಳಿಸುತ್ತೇವೆ.`,
    migrationCommitment:
      "ಅಪ್ಲಿಕೇಶನ್ ಹೋಸ್ಟಿಂಗ್ ಮತ್ತು ಪ್ರಾಥಮಿಕ ಡೇಟಾಬೇಸ್ ಸಂಗ್ರಹಣೆಯನ್ನು ಭಾರತ ಗಣರಾಜ್ಯದಲ್ಲಿರುವ ಮೂಲಸೌಕರ್ಯಕ್ಕೆ ಸ್ಥಳಾಂತರಿಸಲು ನಾವು ಸಿದ್ಧತೆ ನಡೆಸುತ್ತಿದ್ದೇವೆ. ಆ ಸ್ಥಳಾಂತರ ಪೂರ್ಣಗೊಂಡ ನಂತರ ಈ ಗೌಪ್ಯತಾ ಸೂಚನೆ ಮತ್ತು ಕೆಳಗಿನ ಉಪಪ್ರಕ್ರಿಯೆದಾರ ಪಟ್ಟಿಯನ್ನು ನವೀಕರಿಸುತ್ತೇವೆ.",
    retention:
      "ಸಕ್ರಿಯ ಖಾತೆಗೆ ಸಂಬಂಧಿಸಿದ ಗುರುತು, ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಖಾತೆ ಸಕ್ರಿಯವಾಗಿರುವವರೆಗೆ ಕಾಯ್ದಿರಿಸಲಾಗುತ್ತದೆ. ಖಾತೆ ಮುಚ್ಚಿದ ನಂತರ ಗುರುತು ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಮுப்பತ್ತು ದಿನಗಳೊಳಗೆ ಅಳಿಸಲಾಗುತ್ತದೆ ಅಥವಾ ಶಾಶ್ವತವಾಗಿ ಗುರುತಿಸಲಾಗದಂತೆ ಅನಾಮಧೇಯಗೊಳಿಸಲಾಗುತ್ತದೆ. ಆದರೆ ಡಿಪಿಡಿಪಿ ನಿಯಮಗಳ ಪ್ರಕಾರ ಕನಿಷ್ಠ ಒಂದು ವರ್ಷದ ಪ್ರಕ್ರಿಯಾ ಲಾಗ್‌ಗಳು ಮತ್ತು ಭಾರತೀಯ ತೆರಿಗೆ/ಕಂಪನಿ ಕಾನೂನುಗಳಿಗೆ ಅಗತ್ಯವಿರುವ ಹಣಕಾಸು ದಾಖಲೆಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಬಹುದು.",
    noMarketingShare:
      "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ, ಬುಕ್ಕಿಂಗ್ ಇತಿಹಾಸ, ಆರೋಗ್ಯ ಮಾಹಿತಿ ಅಥವಾ ಕ್ಷೇಮಾಭಿರುಚಿಗಳನ್ನು ಜಾಹೀರಾತುದಾರರು, ವಿಶ್ಲೇಷಣಾ ಪೂರೈಕೆದಾರರು ಅಥವಾ ಮೂರನೇ ವ್ಯಕ್ತಿಯ ಮಾರುಕಟ್ಟೆ ಜಾಲಗಳೊಂದಿಗೆ ನಾವು ಹಂಚುವುದಿಲ್ಲ, ಮಾರುವುದಿಲ್ಲ, ಬಾಡಿಗೆಗೆ ನೀಡುವುದಿಲ್ಲ, ಪರವಾನಗಿ ನೀಡುವುದಿಲ್ಲ ಅಥವಾ ವ್ಯಾಪಾರ ಮಾಡುವುದಿಲ್ಲ.",
    subprocessorShare:
      "ನಮ್ಮ ಸೂಚನೆಗಳ ಮೇರೆಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಉಪಪ್ರಕ್ರಿಯೆದಾರರೊಂದಿಗೆ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ ಹಂಚಿದರೆ, Railway Corp. (ಇಂಟರಿಮ್ ಹೋಸ್ಟಿಂಗ್), Razorpay (ಪಾವತಿಗಳು), ಮತ್ತು Google (ಸೈನ್-ಇನ್ ಮತ್ತು ಇಮೇಲ್) ಸೇರಿದಂತೆ, ಪ್ರತಿ ಉಪಪ್ರಕ್ರಿಯೆದಾರ ತನ್ನ ಕಾರ್ಯವನ್ನು ನಿರ್ವಹಿಸಲು ಅಗತ್ಯವಿರುವ ಮಟ್ಟಿಗೆ ಮಾತ್ರ ಹಂಚಿಕೆ ಸೀಮಿತವಾಗಿರುತ್ತದೆ. ನಮ್ಮ ಗೌಪ್ಯತಾ ಸೂಚನೆಯಲ್ಲಿನ ಉಪಪ್ರಕ್ರಿಯೆದಾರ ಪಟ್ಟಿಯನ್ನು ನೋಡಿ.",
    consentProfileProcessing: `ನನ್ನ ಹೆಸರು, ಇಮೇಲ್ ವಿಳಾಸ, ಸಂಪರ್ಕ ಸಂಖ್ಯೆ, ಜನ್ಮ ದಿನಾಂಕ ಮತ್ತು ಬುಕ್ಕಿಂಗ್ ಇತಿಹಾಸವನ್ನು ಖಾತೆ ರಚನೆ, ಬುಕ್ಕಿಂಗ್ ನಿರ್ವಹಣೆ, ಸಂಬಂಧಿತ ನೆರವು ಮತ್ತು ಸಂವಹನಗಳಿಗಾಗಿ ಸಂಗ್ರಹಿಸಿ ಸಂಸ್ಕರಿಸಲು ನಾನು ${LEGAL_CONFIG.brandName} ಗೆ ಸಮ್ಮತಿ ನೀಡುತ್ತೇನೆ. ಈ ಮಾಹಿತಿಯನ್ನು ${LEGAL_CONFIG.companyLegalName} ಡಿಪಿಡಿಪಿ ಕಾಯಿದೆ, 2023 ಅಡಿಯಲ್ಲಿ ಸಂಸ್ಕರಿಸುತ್ತದೆ. ಇಂಟರಿಮ್ ಅವಧಿಯಲ್ಲಿ, ಭಾರತದಲ್ಲಿರುವ ಮೂಲಸೌಕರ್ಯಕ್ಕೆ ಯೋಜಿತ ಸ್ಥಳಾಂತರ ಪೂರ್ಣಗೊಳ್ಳುವವರೆಗೆ ನಮ್ಮ ಗೌಪ್ಯತಾ ಸೂಚನೆಯಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲಾದ ಉಪಪ್ರಕ್ರಿಯೆದಾರರು (ಅಮೆರಿಕಾದ Railway Corp. ಸೇರಿದಂತೆ) ಹೋಸ್ಟಿಂಗ್ ಒದಗಿಸುತ್ತಾರೆ.`,
    consentTrustSignal: `${LEGAL_CONFIG.brandName} ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಜಾಹೀರಾತು ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮೂರನೇ ವ್ಯಕ್ತಿಗಳಿಗೆ ಮಾರುವುದಿಲ್ಲ ಅಥವಾ ಹಂಚುವುದಿಲ್ಲ. ವೇದಿಕೆಯನ್ನು ನಡೆಸಲು ಸಹಾಯ ಮಾಡುವ Railway Corp., Razorpay ಮತ್ತು Google ಸೇರಿದಂತೆ ಉಪಪ್ರಕ್ರಿಯೆದಾರರನ್ನು ನಮ್ಮ ಗೌಪ್ಯತಾ ಸೂಚನೆ ಪಟ್ಟಿ ಮಾಡುತ್ತದೆ.`,
  },
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;

export function formatRegisteredOffice(): string {
  const { line1, line2, line3 } = LEGAL_CONFIG.registeredOffice;
  return `${line1}, ${line2}, ${line3}`;
}
