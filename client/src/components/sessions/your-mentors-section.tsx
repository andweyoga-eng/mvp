import { Mail, MessageCircle, Phone } from "lucide-react";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { CUSTOMER_SUPPORT } from "@shared/support";

export interface BookingMentor {
  name: string;
  specialty?: string;
  imageUrl?: string | null;
}

interface YourMentorsSectionProps {
  mentors: BookingMentor[];
}

function mentorSupportMessage(mentorName: string, channel: "whatsapp" | "sms" | "email"): string {
  const base = `Hi andWeYoga team, I would like to reach my mentor ${mentorName}.`;
  if (channel === "email") {
    return encodeURIComponent(`Mentor: ${mentorName}\n\nHi andWeYoga team, I would like help connecting with my mentor.`);
  }
  return encodeURIComponent(base);
}

export function YourMentorsSection({ mentors }: YourMentorsSectionProps) {
  return (
    <section id="your-mentors" className="mb-14" data-testid="your-mentors-section">
      <h2 className="mb-5 font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
        Your Mentors
      </h2>
      <div className="flex flex-col gap-3.5">
        {mentors.map((mentor) => (
          <GlassCard
            key={mentor.name}
            className="rounded-2xl p-4 transition-transform hover:translate-x-1"
          >
            <div className="mb-4 flex items-center gap-3.5">
              <div className="flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary via-[#4b3282] to-dz-secondary font-display text-lg font-bold text-white">
                {mentor.imageUrl ? (
                  <img
                    src={mentor.imageUrl}
                    alt={mentor.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  mentor.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-base font-semibold text-primary">{mentor.name}</h4>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {mentor.specialty ?? "andWeYoga Instructor"}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href={`${CUSTOMER_SUPPORT.whatsappHref}?text=${mentorSupportMessage(mentor.name, "whatsapp")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(37,211,102,0.2)] bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[rgba(37,211,102,0.06)]"
                data-testid={`mentor-message-${mentor.name}`}
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                Message
              </a>
              <a
                href={CUSTOMER_SUPPORT.telHref}
                className="flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white px-3 py-2.5 text-center transition-colors hover:bg-primary/[0.04]"
                data-testid={`mentor-call-${mentor.name}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  Call
                </span>
                <span className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  This call may be recorded for quality or training purpose.
                </span>
              </a>
              <a
                href={`mailto:${CUSTOMER_SUPPORT.email}?subject=${encodeURIComponent(`Mentor: ${mentor.name}`)}&body=${mentorSupportMessage(mentor.name, "email")}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-primary/10 bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/[0.04]"
                data-testid={`mentor-mail-${mentor.name}`}
              >
                <Mail className="h-4 w-4 text-primary" />
                Mail
              </a>
            </div>
          </GlassCard>
        ))}
        {mentors.length === 0 && (
          <GlassCard className="p-6 text-center text-sm text-muted-foreground">
            Book a session to see your mentors here.
          </GlassCard>
        )}
      </div>
    </section>
  );
}
