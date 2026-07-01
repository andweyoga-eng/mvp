import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentCheckboxVariant = "primary" | "secondary" | "destructive";

const checkedStyles: Record<ConsentCheckboxVariant, string> = {
  primary: "border-primary bg-primary text-white",
  secondary: "border-dz-secondary bg-dz-secondary text-white",
  destructive: "border-destructive bg-destructive text-white",
};

/** Consent / legal acknowledgement control — bold circular border when unchecked. */
export function ConsentCheckbox({
  checked,
  onChange,
  label,
  testId,
  variant = "primary",
  className,
  labelClassName,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  testId: string;
  variant?: ConsentCheckboxVariant;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-dz-glass-border bg-white/50 p-3",
        className,
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          checked ? checkedStyles[variant] : "border-primary/60 bg-white",
        )}
        data-testid={testId}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </button>
      <span className={cn("text-sm leading-snug text-foreground", labelClassName)}>{label}</span>
    </label>
  );
}
