import logoPath from "@assets/Logo Transperent TM_1756454893432.png";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  testId?: string;
}

export function BrandLogo({
  className,
  imgClassName = "h-[clamp(38px,5.5vw,48px)] w-auto",
  testId = "logo",
}: BrandLogoProps) {
  return (
    <a
      href="/"
      onClick={(e) => {
        e.preventDefault();
        navigateToHomeSection("home");
      }}
      className={cn("inline-flex flex-shrink-0", className)}
      aria-label="andWeYoga home"
      data-testid={testId}
    >
      <img
        src={logoPath}
        alt="andWeYoga"
        className={cn("w-auto transition-opacity hover:opacity-90", imgClassName)}
      />
    </a>
  );
}
