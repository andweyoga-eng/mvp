import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import { CLASS_INTENSITIES, type ClassIntensity } from "@shared/schema";
import { formatIstTime } from "@shared/ist-datetime";

export interface PracticeClassType {
  id: string;
  name: string;
  price: number;
  duration?: number;
  intensity?: string | null;
  imageUrl?: string | null;
  strictNoTo?: string | null;
  description?: string | null;
}

export interface PracticeSession {
  id: string;
  date: string | Date;
  classType: PracticeClassType;
  instructor: { id: string; name: string };
  currentBookings: number;
  maxCapacity: number;
  sessionFrequency?: string | null;
  deliveryMode?: string | null;
}

export interface PracticeScheduleDay {
  day: string;
  date: string | Date;
  classes: PracticeSession[];
}

export const PRACTICE_WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const CLASS_IMAGES: Record<string, string> = {
  "Hatha Yoga": hathaYogaImg,
  Hyyocross: hyyocrossImg,
  Meditation: meditationImg,
  "Sound Therapy": soundtherapyImg,
};

export function practiceClassImage(classType: {
  name: string;
  imageUrl?: string | null;
}): string | undefined {
  if (classType.imageUrl) return classType.imageUrl;
  return CLASS_IMAGES[classType.name];
}

export function samePracticeCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatPracticeTimeIST(date: string | Date): string {
  return formatIstTime(date);
}

export function practiceSessionIntensity(s: PracticeSession): ClassIntensity {
  const value = s.classType.intensity;
  return (CLASS_INTENSITIES as readonly string[]).includes(value ?? "")
    ? (value as ClassIntensity)
    : "Moderate";
}

export function instructorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const SESSIONS_SEARCH_FOCUS_EVENT = "awy:focus-sessions-search";

export function focusSessionsSearch(): void {
  window.dispatchEvent(new CustomEvent(SESSIONS_SEARCH_FOCUS_EVENT));
}
