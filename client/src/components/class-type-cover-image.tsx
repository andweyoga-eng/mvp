import { Flower2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const COVER_GRADIENT = "bg-gradient-to-br from-[#d7cfe6] to-[#c8bdd9]";

/**
 * Canonical cover image classes — mobile + tablet stay in-flow with capped height;
 * prevents tall assets from blowing up checkout cards.
 */
export const CLASS_TYPE_COVER_IMG_CLASS =
  "block h-48 max-h-48 w-full object-cover object-center md:h-56 md:max-h-56";

type ClassTypeCoverImageProps = {
  imageUrl?: string | null;
  alt: string;
  /** Stretch to fill a side column on lg+ checkout layouts (tablet stays stacked). */
  fillColumn?: boolean;
  className?: string;
  testId?: string;
};

type ClassTypeCoverFrameProps = {
  children: ReactNode;
  /** Checkout sidebar on /reserve — side column from lg+; full-width hero on phone/tablet. */
  variant?: "inline" | "checkout-sidebar";
  className?: string;
};

/**
 * Wrapper for class-type hero images. Always use with ClassTypeCoverImage inside.
 */
export function ClassTypeCoverFrame({
  children,
  variant = "inline",
  className,
}: ClassTypeCoverFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden",
        COVER_GRADIENT,
        variant === "checkout-sidebar" &&
          "lg:w-[40%] lg:max-w-[280px] lg:min-h-[180px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Class-type hero image — single source of truth for Teach cards, hub workouts,
 * guest/member checkout summaries, and /reserve.
 *
 * Breakpoints: phone h-48 → tablet (md) h-56 stacked hero → desktop (lg+) checkout sidebar fill.
 */
export function ClassTypeCoverImage({
  imageUrl,
  alt,
  fillColumn = false,
  className,
  testId,
}: ClassTypeCoverImageProps) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex h-48 max-h-48 items-center justify-center md:h-56 md:max-h-56",
          COVER_GRADIENT,
          fillColumn && "lg:h-full lg:max-h-none lg:min-h-[180px]",
          className,
        )}
      >
        <Flower2 className="h-16 w-16 text-primary/25" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      data-testid={testId}
      className={cn(
        CLASS_TYPE_COVER_IMG_CLASS,
        fillColumn &&
          "lg:absolute lg:inset-0 lg:h-full lg:max-h-none lg:min-h-[180px]",
        className,
      )}
    />
  );
}
