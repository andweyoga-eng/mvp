export type SessionsSearchResultKind =
  | "booked_session"
  | "available_session"
  | "available_today"
  | "class_type"
  | "my_mentor"
  | "coach"
  | "site_content"
  | "help";

export interface SessionsSearchResult {
  id: string;
  kind: SessionsSearchResultKind;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  /** Internal ranking; higher surfaces first. */
  score?: number;
}

export interface SessionsSearchCatalog {
  bookedSessions: Array<{
    bookingId: string;
    className: string;
    instructorName: string;
    date: string;
    status: string;
  }>;
  scheduleSessions: Array<{
    id: string;
    className: string;
    classDescription?: string;
    instructorName: string;
    date: string | Date;
    soldOut: boolean;
  }>;
  todaySessions: Array<{
    id: string;
    className: string;
    classDescription?: string;
    instructorName: string;
    date: string | Date;
    soldOut: boolean;
  }>;
  classTypes: Array<{
    id: string;
    name: string;
    description?: string;
    intensity?: string | null;
    duration?: number;
    strictNoTo?: string | null;
  }>;
  mentors: Array<{ name: string; specialty?: string; bio?: string }>;
  publicCoaches: Array<{
    id: string;
    name: string;
    bio?: string | null;
    specialties?: string[] | null;
  }>;
}

/** Provider seam for future agent/LLM search. */
export interface SessionsSearchProvider {
  search(query: string, catalog: SessionsSearchCatalog): SessionsSearchResult[];
}
