export interface HelpSearchEntry {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  href: string;
}

/** Static help topics for v1 search (site + My Account context). */
export const SESSIONS_HELP_INDEX: HelpSearchEntry[] = [
  {
    id: "help-flexi",
    title: "Flexi sessions",
    summary: "Swap or reschedule within your flexi booking window.",
    keywords: ["flexi", "swap", "reschedule", "change session"],
    href: "/my-account#sessions",
  },
  {
    id: "help-profile",
    title: "Complete your profile",
    summary: "Add mobile, emergency contact, and Health History in My Account.",
    keywords: ["profile", "mobile", "phone", "health", "emergency", "complete"],
    href: "/my-account#profile",
  },
  {
    id: "help-sessions",
    title: "Your booked sessions",
    summary: "View upcoming, completed, and cancelled sessions.",
    keywords: ["booking", "booked", "my sessions", "upcoming", "cancelled"],
    href: "/my-account#sessions",
  },
  {
    id: "help-payments",
    title: "Payments and receipts",
    summary: "Payment history, receipts, and invoices in My Account.",
    keywords: ["payment", "receipt", "invoice", "refund", "pay", "razorpay"],
    href: "/my-account#payments",
  },
  {
    id: "help-privacy",
    title: "Privacy and consent",
    summary: "Manage DPDPA consents and privacy preferences.",
    keywords: ["privacy", "consent", "data", "dpdpa", "erase", "delete account"],
    href: "/my-account#privacy",
  },
  {
    id: "help-schedule",
    title: "Weekly class schedule",
    summary: "Browse this week's live sessions and reserve a spot.",
    keywords: ["schedule", "calendar", "week", "classes", "book", "reserve"],
    href: "/dashboard#weekly-schedule",
  },
  {
    id: "help-terms",
    title: "Terms of service",
    summary: "Booking terms, cancellations, and studio policies.",
    keywords: ["terms", "policy", "cancellation", "rules"],
    href: "/terms",
  },
  {
    id: "help-support",
    title: "Contact customer care",
    summary: "WhatsApp, call, or message our team for help.",
    keywords: ["help", "support", "contact", "customer care", "whatsapp", "call"],
    href: "/grievance",
  },
];
