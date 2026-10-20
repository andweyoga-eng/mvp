import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";

export interface PendingQrBooking {
  bookingId: string;
  verificationStatus: string;
  transactionAckNumber: string | null;
  ackSubmittedAt: string | null;
  paymentStatus: string;
  userName: string;
  userEmail: string;
  className: string;
  sessionDate: string;
  instructorName: string;
  price: string;
}

function formatWhen(dateStr: string) {
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

export function PendingUserSessionsPanel({
  pending,
  isLoading,
  onDataChange,
}: {
  pending: PendingQrBooking[];
  isLoading: boolean;
  onDataChange: () => void;
}) {
  const { toast } = useToast();

  const confirmMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/confirm-qr`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment confirmed",
        description: "Confirmation email sent to the member with session details.",
      });
      onDataChange();
    },
    onError: (e: Error) => {
      toast({ title: "Could not confirm", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        QR payments awaiting manual verification ({pending.length} pending)
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-green-600" />
          <p className="font-medium">No pending user sessions</p>
          <p className="text-sm mt-1">When members submit a payment reference, they appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <div key={row.bookingId} className="border rounded-lg p-4 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{row.className}</h3>
                    <Badge className="bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3 mr-1" /> Pending
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {row.userName} · {row.userEmail}
                  </p>
                  <p className="text-sm text-gray-500">
                    {row.instructorName} · {formatWhen(row.sessionDate)}
                  </p>
                  <p className="text-sm mt-2">
                    <span className="font-medium">Payment ref:</span>{" "}
                    {row.transactionAckNumber ?? "N/A"}
                  </p>
                  {row.ackSubmittedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted {formatWhen(row.ackSubmittedAt)}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-2 text-[#3d1b80]">
                    Rs.{row.price}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(row.bookingId)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirm
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
