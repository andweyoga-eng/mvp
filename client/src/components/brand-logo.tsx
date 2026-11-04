import logoPath from "@assets/Logo Transperent TM_1756454893432.png";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { MEMBER_DASHBOARD_URL } from "@/lib/member-landing";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { navigate } from "wouter/use-browser-location";

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
  const { user } = useAuth();

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
      href={user ? MEMBER_DASHBOARD_URL : "/"}
      onClick={(e) => {
        e.preventDefault();
        if (onNavigate) {
          onNavigate();
          return;
        }
        if (user) {
          navigate(MEMBER_DASHBOARD_URL);
          return;
        }
        navigateToHomeSection("home");
      }}
      className={cn("inline-flex flex-shrink-0 max-w-[min(42vw,200px)]", className)}
      aria-label={user ? "andWeYoga dashboard" : "andWeYoga home"}
      data-testid={testId}
    >
      {img}
    </a>
  );
}
