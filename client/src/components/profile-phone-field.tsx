import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodeOptions } from "@/lib/mobile-validation";

type MobileValidation = { isValid: boolean; error: string };

interface ProfilePhoneFieldProps {
  label: ReactNode;
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  mobile: string;
  onMobileChange: (value: string) => void;
  placeholder: string;
  validation: MobileValidation;
  showError?: boolean;
  countrySelectTestId: string;
  mobileInputTestId: string;
  required?: boolean;
}

export function ProfilePhoneField({
  label,
  countryCode,
  onCountryCodeChange,
  mobile,
  onMobileChange,
  placeholder,
  validation,
  showError = true,
  countrySelectTestId,
  mobileInputTestId,
  required,
}: ProfilePhoneFieldProps) {
  const selectedOption = countryCodeOptions.find((option) => option.value === countryCode);
  const hasError = showError && !validation.isValid;

  return (
    <div className="mb-5 md:mb-0 md:space-y-2">
      <Label className="text-sm font-bold text-primary flex items-center gap-2">{label}</Label>

      <div className="mt-1.5 flex items-stretch gap-2">
        <Select value={countryCode} onValueChange={onCountryCodeChange}>
          <SelectTrigger
            className="h-12 w-[110px] shrink-0 px-2 md:h-10 md:w-40 md:px-3"
            data-testid={countrySelectTestId}
          >
            {selectedOption ? (
              <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                <span className="shrink-0" aria-hidden="true">
                  {selectedOption.flag}
                </span>
                <span className="shrink-0 md:hidden">{selectedOption.value}</span>
                <span className="hidden truncate text-xs md:inline">{selectedOption.label}</span>
              </span>
            ) : (
              <SelectValue placeholder="Code" />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {countryCodeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span>{option.flag}</span>
                  <span className="text-xs">{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="tel"
          value={mobile}
          onChange={(e) => onMobileChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`h-12 min-w-0 flex-1 md:h-10 ${hasError ? "border-red-500" : ""}`}
          data-testid={mobileInputTestId}
        />
      </div>

      {hasError && (
        <p
          className="mt-1 flex w-full items-start gap-1 text-xs leading-snug text-red-500"
          data-testid={`${mobileInputTestId}-error`}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{validation.error}</span>
        </p>
      )}
    </div>
  );
}
