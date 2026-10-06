import { Loader2 } from "lucide-react";

export function CheckoutProcessingOverlay({
  title,
  description,
}: {
  title: string;
  description?: string | null;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[22px] bg-dz-surface/85 backdrop-blur-sm"
      data-testid="checkout-processing-overlay"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-14 w-14 animate-spin text-primary" aria-hidden />
      <p className="mt-4 px-6 text-center font-display text-lg font-semibold text-primary">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[280px] px-6 text-center text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
