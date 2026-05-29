import { Badge } from "@/components/ui/badge";

interface ClassType {
  id: string;
  name: string;
  price: string;
}

interface Instructor {
  id: string;
  name: string;
}

interface ClassSession {
  id: string;
  classTypeId: string;
  instructorId: string;
  date: string;
  maxCapacity: number;
  currentBookings: number;
  googleMeetLink?: string | null;
  razorpayLink?: string | null;
}

function formatDate(dateStr: string) {
  return (
    new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }) + " IST"
  );
}

export function SessionHistoryList({
  sessions,
  classTypes,
  instructors,
}: {
  sessions: ClassSession[];
  classTypes: ClassType[];
  instructors: Instructor[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-medium">No past sessions</p>
        <p className="text-sm mt-1">Completed sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((sess) => {
        const ct = classTypes.find((c) => c.id === sess.classTypeId);
        const ins = instructors.find((i) => i.id === sess.instructorId);
        const isFull = sess.currentBookings >= sess.maxCapacity;

        return (
          <div
            key={sess.id}
            className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow opacity-90"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{ct?.name ?? "Unknown class"}</h3>
                  <Badge variant="secondary" className="text-xs">
                    Past
                  </Badge>
                  {isFull && <Badge className="bg-red-100 text-red-700 text-xs">Was full</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {ins?.name ?? "Unknown instructor"} · {formatDate(sess.date)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {sess.currentBookings}/{sess.maxCapacity} booked
                </p>
              </div>
              {ct && (
                <Badge variant="outline" className="text-[#3d1b80] border-[#3d1b80] shrink-0">
                  Rs.{ct.price}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
