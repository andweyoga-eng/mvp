import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticky action bar for mobile sub-pages (48px+ touch targets). */
export function AccountStickyActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className="h-28 md:hidden" aria-hidden="true" />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur-sm md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
          className,
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">{children}</div>
      </div>
    </>
  );
}
