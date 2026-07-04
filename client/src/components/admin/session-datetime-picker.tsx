import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;
const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse `YYYY-MM-DDTHH:mm` (datetime-local style). */
export function parseSessionDatetimeLocal(value: string): {
  date: Date;
  hour24: number;
  minute: number;
} | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return { date, hour24: Number(h), minute: Number(mi) };
}

export function formatSessionDatetimeLocal(date: Date, hour24: number, minute: number): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour24)}:${pad2(minute)}`;
}

function to12Hour(hour24: number): { hour12: number; ampm: "AM" | "PM" } {
  const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, ampm };
}

function to24Hour(hour12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function formatSessionDatetimeDisplay(value: string): string {
  const parsed = parseSessionDatetimeLocal(value);
  if (!parsed) return "";
  const { date, hour24, minute } = parsed;
  const { hour12, ampm } = to12Hour(hour24);
  const datePart = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return `${datePart} · ${hour12}:${pad2(minute)} ${ampm} IST`;
}

function defaultDraft(): {
  date: Date;
  hour12: number;
  minute: string;
  ampm: "AM" | "PM";
} {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  if (now.getMinutes() >= 60) {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  }
  const { hour12, ampm } = to12Hour(now.getHours());
  const minute = MINUTE_OPTIONS.find((m) => Number(m) >= now.getMinutes()) ?? "00";
  return { date: now, hour12, minute, ampm };
}

interface SessionDateTimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function SessionDateTimePicker({
  id = "session-datetime",
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className,
}: SessionDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseSessionDatetimeLocal(value), [value]);

  const [draftDate, setDraftDate] = useState<Date>(() => parsed?.date ?? defaultDraft().date);
  const [draftHour12, setDraftHour12] = useState(() => {
    if (parsed) return to12Hour(parsed.hour24).hour12;
    return defaultDraft().hour12;
  });
  const [draftMinute, setDraftMinute] = useState(() => {
    if (parsed) return pad2(parsed.minute);
    return defaultDraft().minute;
  });
  const [draftAmpm, setDraftAmpm] = useState<"AM" | "PM">(() => {
    if (parsed) return to12Hour(parsed.hour24).ampm;
    return defaultDraft().ampm;
  });

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setDraftDate(parsed.date);
      const { hour12, ampm } = to12Hour(parsed.hour24);
      setDraftHour12(hour12);
      setDraftMinute(pad2(parsed.minute));
      setDraftAmpm(ampm);
    } else {
      const d = defaultDraft();
      setDraftDate(d.date);
      setDraftHour12(d.hour12);
      setDraftMinute(d.minute);
      setDraftAmpm(d.ampm);
    }
  }, [open, parsed]);

  const displayLabel = value ? formatSessionDatetimeDisplay(value) : "Pick date & time";

  function applyDraft() {
    const hour24 = to24Hour(draftHour12, draftAmpm);
    const next = formatSessionDatetimeLocal(draftDate, hour24, Number(draftMinute));
    onChange(next);
    setOpen(false);
    onBlur?.();
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !value && "text-muted-foreground",
              error && "border-red-500",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#bb5309]" />
              Session date & time
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <Calendar
              mode="single"
              selected={draftDate}
              onSelect={(d) => d && setDraftDate(d)}
              disabled={(d) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d < today;
              }}
              initialFocus
              className="rounded-md border"
            />
            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground">Time (IST)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={String(draftHour12)}
                  onValueChange={(v) => setDraftHour12(Number(v))}
                >
                  <SelectTrigger aria-label="Hour">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {HOUR_12_OPTIONS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={draftMinute} onValueChange={setDraftMinute}>
                  <SelectTrigger aria-label="Minute">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        :{m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draftAmpm}
                  onValueChange={(v) => setDraftAmpm(v as "AM" | "PM")}
                >
                  <SelectTrigger aria-label="AM or PM">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#bb5309] hover:bg-[#9a4508] text-white"
              onClick={applyDraft}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
