import { cn } from "@/lib/utils";

/** Shown on every studio photo. Same line on the hero, flow cards, and listings. */
export const AI_IMAGE_DISCLAIMER =
  "Creative representation. Any resemblance to persons, living or dead, is purely coincidental. Image Src: AI generated.";

type AiImageDisclaimerProps = {
  /** bar: full-width strip on a photo. corner: short block that stays off overlaid titles. */
  placement?: "bar" | "corner";
  className?: string;
  testId?: string;
  /** Clicks on the line do not activate a parent photo link. */
  blockParentClick?: boolean;
};

export function AiImageDisclaimer({
  placement = "bar",
  className,
  testId = "ai-image-disclaimer",
  blockParentClick = false,
}: AiImageDisclaimerProps) {
  return (
    <p
      data-testid={testId}
      data-hero-no-navigate={blockParentClick ? "" : undefined}
      onClick={blockParentClick ? (event) => event.stopPropagation() : undefined}
      className={cn(
        "pointer-events-none absolute z-20 font-medium text-white",
        blockParentClick && "pointer-events-auto",
        placement === "bar" &&
          "inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-1.5 pt-5 text-right text-[9px] leading-snug sm:text-[10px]",
        placement === "corner" &&
          "bottom-2 right-2 max-w-[min(88%,34rem)] text-right text-[10px] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:bottom-3 sm:right-3 sm:text-[11px]",
        className,
      )}
    >
      {AI_IMAGE_DISCLAIMER}
    </p>
  );
}
