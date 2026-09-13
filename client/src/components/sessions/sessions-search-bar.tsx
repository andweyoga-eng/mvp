import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, ArrowRight } from "lucide-react";
import { SESSIONS_SEARCH_FOCUS_EVENT } from "@/lib/practice-schedule";
import { localSessionsSearchProvider } from "@/lib/sessions-search/local-provider";
import type { SessionsSearchCatalog, SessionsSearchResult } from "@/lib/sessions-search/types";

interface SessionsSearchBarProps {
  catalog: SessionsSearchCatalog;
  onReserveSession: (sessionId: string) => void;
  onBookClassType: (classTypeId: string) => void;
  onScrollToMentors: () => void;
}

const KIND_LABELS: Record<SessionsSearchResult["kind"], string> = {
  booked_session: "Your booking",
  available_session: "Upcoming",
  available_today: "Available today",
  class_type: "Class",
  my_mentor: "Your mentor",
  coach: "Coach",
  site_content: "Discover",
  help: "Help",
};

function navigateHref(href: string, setLocation: (path: string) => void): void {
  if (href.startsWith("/#")) {
    const hash = href.slice(2);
    if (window.location.pathname !== "/") {
      window.location.href = href;
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (href.includes("#")) {
    setLocation(href);
    const anchor = href.split("#")[1];
    window.setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return;
  }
  setLocation(href);
}

export function SessionsSearchBar({
  catalog,
  onReserveSession,
  onBookClassType,
  onScrollToMentors,
}: SessionsSearchBarProps) {
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setOpen(true);
    };
    window.addEventListener(SESSIONS_SEARCH_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(SESSIONS_SEARCH_FOCUS_EVENT, onFocus);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return localSessionsSearchProvider.search(query, catalog);
  }, [query, catalog]);

  const handleSelect = (result: SessionsSearchResult) => {
    setOpen(false);
    setQuery("");

    if (result.kind === "available_session" || result.kind === "available_today") {
      const sessionId = result.id.replace(/^(schedule|today)-/, "");
      onReserveSession(sessionId);
      return;
    }
    if (result.kind === "class_type") {
      const classTypeId = result.id.replace(/^class-/, "");
      onBookClassType(classTypeId);
      return;
    }
    if (result.kind === "my_mentor") {
      onScrollToMentors();
      return;
    }
    if (result.href) {
      navigateHref(result.href, setLocation);
      return;
    }
    if (result.kind === "booked_session") {
      setLocation("/my-account#sessions");
    }
  };

  return (
    <section className="relative mb-8" data-testid="sessions-search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id="sessions-search-input"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search, discover anything at andweyoga, ask a question"
          className="w-full rounded-2xl border border-dz-glass-border bg-dz-surface/80 py-3.5 pl-12 pr-4 text-[15px] text-foreground shadow-dz-ambient backdrop-blur-[16px] placeholder:text-muted-foreground/70 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/15"
          data-testid="sessions-search-input"
          aria-label="Search sessions, classes, coaches, articles, and help"
          aria-expanded={open && results.length > 0}
          aria-controls="sessions-search-results"
        />
      </div>

      {open && query.trim() && (
        <div
          id="sessions-search-results"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-dz-glass-border bg-dz-surface shadow-dz-ambient"
          role="listbox"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches yet. Try a class, coach, sound therapy, seniors, or a topic like flexi.
            </p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto py-1">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/[0.05]"
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{result.title}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          {KIND_LABELS[result.kind]}
                        </span>
                      </div>
                      {result.subtitle ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {result.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
