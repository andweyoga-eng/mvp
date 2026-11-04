import { CalendarCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function AlreadyBookedSessionContent({
  className,
  instructorName,
  sessionDate,
  onViewSessions,
  onCancel,
}: {
  className: string;
  instructorName: string;
  sessionDate: string;
  onViewSessions: () => void;
  onCancel: () => void;
}) {
  const sessionWhen = new Date(sessionDate);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm">
          <CalendarCheck className="h-6 w-6 text-[#3d1b80]" />
        </div>
        <p className="text-xl font-semibold text-[#3d1b80]">You&apos;ve already booked this session</p>
        <p className="text-base text-purple-900/90 leading-relaxed">
          Your spot for <span className="font-semibold">{className}</span> is already reserved. Head
          to My Sessions to view details or manage your booking.
        </p>
      </div>

      <div className="rounded-lg border border-purple-100 bg-white/80 p-3 text-sm text-purple-800 space-y-1">
        <p className="font-medium">{className}</p>
        <p className="text-purple-600">With {instructorName}</p>
        <p className="flex items-center gap-2 text-purple-700">
          <Clock className="h-4 w-4 shrink-0" />
          {format(sessionWhen, "EEE, MMM d")} · {format(sessionWhen, "h:mm a")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full bg-primary hover:bg-primary/90 !text-white font-bold"
          onClick={onViewSessions}
        >
          View My Sessions
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-purple-200 text-purple-800 hover:bg-purple-50 font-semibold"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
