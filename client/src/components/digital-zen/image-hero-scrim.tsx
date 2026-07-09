import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/** Scrim variants for text-over-image heroes — keeps copy legible at every breakpoint. */
export type ImageHeroScrimVariant =
  | "light-side"
  | "brand-horizontal"
  | "brand-bottom"
  | "dark-bottom";

interface ImageHeroScrimProps extends HTMLAttributes<HTMLDivElement> {
  variant: ImageHeroScrimVariant;
}

/**
 * Layered gradient scrim placed between a photo and foreground text.
 * - light-side: dashboard-style light surface scrim (horizontal desktop, vertical mobile)
 * - brand-horizontal: purple brand scrim (workshops-style)
 * - dark-bottom: dark bottom scrim for white text (emojou/explore-style)
 */
export function ImageHeroScrim({ variant, className, ...props }: ImageHeroScrimProps) {
  if (variant === "light-side") {
    return (
      <>
        <div
          className={cn("dz-scrim-light-side-mobile absolute inset-0 z-[2] lg:hidden", className)}
          aria-hidden
          {...props}
        />
        <div
          className={cn("dz-scrim-light-side-desktop absolute inset-0 z-[2] hidden lg:block", className)}
          aria-hidden
        />
      </>
    );
  }

  if (variant === "brand-horizontal") {
    return (
      <>
        <div
          className={cn("dz-scrim-brand-mobile absolute inset-0 z-[2] lg:hidden", className)}
          aria-hidden
          {...props}
        />
        <div
          className={cn("dz-scrim-brand-desktop absolute inset-0 z-[2] hidden lg:block", className)}
          aria-hidden
        />
      </>
    );
  }

  if (variant === "brand-bottom") {
    return (
      <div
        className={cn("dz-scrim-brand-bottom absolute inset-0 z-[2]", className)}
        aria-hidden
        {...props}
      />
    );
  }

  return (
    <div
      className={cn("dz-scrim-dark-bottom absolute inset-0 z-[2]", className)}
      aria-hidden
      {...props}
    />
  );
}

interface ImageHeroContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a glass panel on tablet/mobile so text never sits directly on photography. */
  glassOnMobile?: boolean;
}

export function ImageHeroContent({
  children,
  className,
  glassOnMobile = false,
  ...props
}: ImageHeroContentProps) {
  return (
    <div
      className={cn(
        "relative z-[3]",
        glassOnMobile &&
          "max-lg:rounded-2xl max-lg:border max-lg:border-dz-glass-border max-lg:bg-dz-glass/85 max-lg:shadow-dz-ambient max-lg:backdrop-blur-[16px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
