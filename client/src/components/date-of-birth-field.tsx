import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function parseIsoDateParts(iso: string): { day: string; month: string; year: string } {
  const [year = "", month = "", day = ""] = iso.split("-");
  return { year, month, day };
}

export function composeIsoDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function daysInMonth(month: string, year: string): number {
  if (!month || !year) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

interface DateOfBirthFieldProps {
  id?: string;
  label: React.ReactNode;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  testIdPrefix?: string;
}

export function DateOfBirthField({
  id = "date-of-birth",
  label,
  value,
  onChange,
  disabled = false,
  error,
  className,
  testIdPrefix = "dob",
}: DateOfBirthFieldProps) {
  const parsed = parseIsoDateParts(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const next = parseIsoDateParts(value);
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 100 }, (_, i) => String(currentYear - i)),
    [currentYear],
  );
  const maxDay = daysInMonth(month, year);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0")),
    [maxDay],
  );

  const setPart = (part: "day" | "month" | "year", next: string) => {
    let nextDay = day;
    let nextMonth = month;
    let nextYear = year;
    if (part === "day") nextDay = next;
    if (part === "month") nextMonth = next;
    if (part === "year") nextYear = next;

    if (part !== "day" && nextDay && Number(nextDay) > daysInMonth(nextMonth, nextYear)) {
      nextDay = String(daysInMonth(nextMonth, nextYear)).padStart(2, "0");
    }

    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(composeIsoDate(nextDay, nextMonth, nextYear));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={`${id}-day`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="grid grid-cols-3 gap-2">
        <Select value={day || undefined} onValueChange={(v) => setPart("day", v)} disabled={disabled}>
          <SelectTrigger id={`${id}-day`} data-testid={`${testIdPrefix}-day`} aria-label="Day">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {dayOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {Number(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={month || undefined}
          onValueChange={(v) => setPart("month", v)}
          disabled={disabled}
        >
          <SelectTrigger data-testid={`${testIdPrefix}-month`} aria-label="Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year || undefined} onValueChange={(v) => setPart("year", v)} disabled={disabled}>
          <SelectTrigger data-testid={`${testIdPrefix}-year`} aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
