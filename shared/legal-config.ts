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
  documentVersion: "v1.0.0_2026-06-30",
  lastUpdated: "30 June 2026",
  lastUpdatedIso: "2026-06-30",
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
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;

export function formatRegisteredOffice(): string {
  const { line1, line2, line3 } = LEGAL_CONFIG.registeredOffice;
  return `${line1}, ${line2}, ${line3}`;
}
