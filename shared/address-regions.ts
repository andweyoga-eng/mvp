/** ISO 3166-1 alpha-2 country codes for mailing address. */
export const DEFAULT_ADDRESS_COUNTRY = "IN";

export const ADDRESS_COUNTRY_OPTIONS = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
  { value: "NP", label: "Nepal" },
  { value: "LK", label: "Sri Lanka" },
  { value: "BD", label: "Bangladesh" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "OTHER", label: "Other" },
] as const;

export type AddressCountryCode = (typeof ADDRESS_COUNTRY_OPTIONS)[number]["value"];

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
] as const;

const CA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Saskatchewan", "Yukon",
] as const;

const AU_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
  "South Australia", "Tasmania", "Victoria", "Western Australia",
] as const;

const GB_REGIONS = [
  "England", "Northern Ireland", "Scotland", "Wales",
] as const;

const AE_EMIRATES = [
  "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain",
] as const;

function toOptions(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export const ADDRESS_STATES_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  IN: toOptions(INDIAN_STATES),
  US: toOptions(US_STATES),
  CA: toOptions(CA_PROVINCES),
  AU: toOptions(AU_STATES),
  GB: toOptions(GB_REGIONS),
  AE: toOptions(AE_EMIRATES),
};

export function getAddressStatesForCountry(countryCode: string) {
  return ADDRESS_STATES_BY_COUNTRY[countryCode] ?? [];
}

export function hasPredefinedAddressStates(countryCode: string): boolean {
  return getAddressStatesForCountry(countryCode).length > 0;
}

export function addressCountryLabel(code: string | null | undefined): string {
  if (!code) return ADDRESS_COUNTRY_OPTIONS[0].label;
  return ADDRESS_COUNTRY_OPTIONS.find((c) => c.value === code)?.label ?? code;
}
