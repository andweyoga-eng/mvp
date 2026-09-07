import logoPath from "@assets/Logo Transperent TM_1756454893432.png";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  testId?: string;
  /** When false, renders the logo without a home link (e.g. inline in headings). */
  linked?: boolean;
  /** Override default home navigation (e.g. checkout must clear pending booking first). */
  onNavigate?: () => void;
}

export function BrandLogo({
  className,
  imgClassName = "h-[clamp(38px,5.5vw,48px)] w-auto",
  testId = "logo",
  linked = true,
  onNavigate,
}: BrandLogoProps) {
  const img = (
    <img
      src={logoPath}
      alt="andWeYoga"
      className={cn("w-auto", linked && "transition-opacity hover:opacity-90", imgClassName)}
    />
  );

  if (!linked) {
    return (
      <span className={cn("inline-flex flex-shrink-0", className)} data-testid={testId}>
        {img}
      </span>
    );
  }

  return (
    <a
      href="/"
      onClick={(e) => {
        e.preventDefault();
        if (onNavigate) {
          onNavigate();
          return;
        }
        navigateToHomeSection("home");
      }}
      className={cn("inline-flex flex-shrink-0", className)}
      aria-label="andWeYoga home"
      data-testid={testId}
    >
      {img}
    </a>
  );
}
