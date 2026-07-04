import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CreditCard, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import {
  PAYMENT_DISPOSITION_LABELS,
  formatGatewayPaymentStatus,
  formatManualPaymentStatus,
  isAutomatedGatewayCapture,
  isManualVerificationMethod,
  requiresAdminVerification,
  type PaymentDisposition,
} from "@shared/payment-gateway";
import { useToast } from "@/hooks/use-toast";

export interface AdminPaymentHistoryRow {
  id: string;
  bookingId: string;
  userName: string;
  userEmail: string;
  className: string;
  sessionDate: string;
  amountPaise: number | null;
  currency: string;
  paymentMethod: string | null;
  gatewayProvider: string | null;
  gatewayReference: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  gatewayPaymentMethod: string | null;
  status: string;
  adminDisposition: PaymentDisposition;
  bookingPaymentStatus?: string | null;
  verificationStatus?: string | null;
  transactionAckNumber?: string | null;
  paidAt: string | null;
  createdAt: string;
}

export const ADMIN_PAYMENT_HISTORY_QUERY_KEY = ["/api/admin/payments/history"] as const;

/** Poll interval so QR/link submissions appear without manual refresh. */
export const ADMIN_PAYMENT_HISTORY_REFETCH_MS = 4000;

export async function fetchAdminPaymentHistory(): Promise<AdminPaymentHistoryRow[]> {
  const res = await fetch("/api/admin/payments/history", { headers: adminHeaders() });
  if (!res.ok) throw new Error("Failed to load payments");
  return res.json();
}

export const adminPaymentHistoryQueryOptions = {
  queryKey: ADMIN_PAYMENT_HISTORY_QUERY_KEY,
  queryFn: fetchAdminPaymentHistory,
  refetchInterval: ADMIN_PAYMENT_HISTORY_REFETCH_MS,
  refetchOnWindowFocus: true,
};

const statusBadgeClass = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes("paid") || lower.includes("received")) {
    return "bg-green-100 text-green-800";
  }
  if (lower.includes("fail")) return "bg-red-100 text-red-800";
  if (lower.includes("dispute")) return "bg-purple-100 text-purple-800";
  return "bg-amber-100 text-amber-900";
};

function formatGatewayMethod(method: string | null): string {
  if (!method) return "N/A";
  return method.replace(/_/g, " ").toUpperCase();
}

function formatAmount(paise: number | null, currency: string): string {
  if (paise == null) return "N/A";
  const rupees = paise / 100;
  return `${currency === "INR" ? "₹" : ""}${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatSessionPaymentMethod(method: string | null | undefined): string {
  if (!method) return "N/A";
  const m = method.replace(/_/g, " ");
  if (m === "razorpay link") return "Payment link";
  if (m === "razorpay gateway") return "Razorpay checkout";
  return m;
}

function PaymentStatusCell({
  row,
  onVerified,
}: {
  row: AdminPaymentHistoryRow;
  onVerified: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [disposition, setDisposition] = useState<PaymentDisposition>("received");

  const verifyMutation = useMutation({
    mutationFn: async (selectedDisposition: PaymentDisposition) => {
      const res = await fetch(`/api/admin/payments/${row.id}/verify`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ adminDisposition: selectedDisposition }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (data: { message?: string }) => {
      toast({ title: data.message ?? "Payment updated" });
      setOpen(false);
      onVerified();
    },
    onError: (e: Error) => {
      toast({ title: "Could not verify", description: e.message, variant: "destructive" });
    },
  });

  if (isAutomatedGatewayCapture(row.paymentMethod, row.gatewayProvider)) {
    const label = formatGatewayPaymentStatus(row.status);
    return (
      <div className="space-y-1">
        <Badge className={statusBadgeClass(label)}>{label}</Badge>
        {row.paidAt && (
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(row.paidAt), "MMM d, yyyy HH:mm")}
          </p>
        )}
      </div>
    );
  }

  if (isManualVerificationMethod(row.paymentMethod, row.gatewayProvider)) {
    const needsVerify = requiresAdminVerification({
      paymentMethod: row.paymentMethod,
      gatewayProvider: row.gatewayProvider,
      status: row.status,
      adminDisposition: row.adminDisposition,
      bookingPaymentStatus: row.bookingPaymentStatus,
      verificationStatus: row.verificationStatus,
      transactionAckNumber: row.transactionAckNumber,
    });

    if (!needsVerify) {
      const label = formatManualPaymentStatus(row.adminDisposition, row.status);
      return (
        <div className="space-y-1">
          <Badge className={statusBadgeClass(label)}>{label}</Badge>
          {row.paidAt && (
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(row.paidAt), "MMM d, yyyy HH:mm")}
            </p>
          )}
        </div>
      );
    }

    if (!open) {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-[#bb5309]/40 text-[#bb5309] hover:bg-orange-50"
          onClick={() => setOpen(true)}
        >
          Verify
        </Button>
      );
    }

    return (
      <div
        className="space-y-2 rounded-md border border-[#bb5309]/25 bg-orange-50/50 p-2 min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        {row.transactionAckNumber ? (
          <p className="text-[10px] text-muted-foreground break-all">
            Ref: <span className="font-mono">{row.transactionAckNumber}</span>
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Confirm after checking the member&apos;s external payment.
          </p>
        )}
        <Select
          value={disposition}
          onValueChange={(v) => setDisposition(v as PaymentDisposition)}
        >
          <SelectTrigger className="h-8 bg-white">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_DISPOSITION_LABELS) as PaymentDisposition[]).map((d) => (
              <SelectItem key={d} value={d}>
                {PAYMENT_DISPOSITION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            className="h-7 flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={verifyMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              verifyMutation.mutate(disposition);
            }}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {verifyMutation.isPending ? "Saving…" : "Confirm"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={verifyMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const label = formatGatewayPaymentStatus(row.status);
  return <Badge className={statusBadgeClass(label)}>{label}</Badge>;
}

export function PaymentHistoryPanel() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery<AdminPaymentHistoryRow[]>(
    adminPaymentHistoryQueryOptions,
  );

  const pendingVerifyCount = rows.filter((row) =>
    requiresAdminVerification({
      paymentMethod: row.paymentMethod,
      status: row.status,
      adminDisposition: row.adminDisposition,
      bookingPaymentStatus: row.bookingPaymentStatus,
      verificationStatus: row.verificationStatus,
      transactionAckNumber: row.transactionAckNumber,
    }),
  ).length;

  function onVerified() {
    qc.invalidateQueries({ queryKey: ADMIN_PAYMENT_HISTORY_QUERY_KEY });
    qc.invalidateQueries({ queryKey: ["/api/sessions/my"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/classes"] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#3d1b80]" />
            Payment History
            {pendingVerifyCount > 0 && (
              <Badge className="bg-[#bb5309] text-white">{pendingVerifyCount} to verify</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Permanent ledger of all payments. Gateway checkouts show their final status automatically.
            Payment link and QR transactions are verified here.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading payments…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No payment transactions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Session</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Paid via</th>
                  <th className="py-2 pr-3">Checkout contact</th>
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{row.userName}</p>
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p>{row.className}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(row.sessionDate), "MMM d, yyyy HH:mm")}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {formatSessionPaymentMethod(row.paymentMethod)}
                      </p>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatAmount(row.amountPaise, row.currency)}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium">{formatGatewayMethod(row.gatewayPaymentMethod)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-xs">{row.payerEmail ?? "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{row.payerPhone ?? "N/A"}</p>
                      {row.payerName && (
                        <p className="text-xs text-muted-foreground">{row.payerName}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 max-w-[140px]">
                      <p className="font-mono text-xs break-all">
                        {row.gatewayReference ?? row.transactionAckNumber ?? "N/A"}
                      </p>
                      {row.gatewayProvider && (
                        <p className="text-xs text-muted-foreground">{row.gatewayProvider}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 min-w-[160px]">
                      <PaymentStatusCell row={row} onVerified={onVerified} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Pending manual verifications — for nav badges */
export function countPendingPaymentVerifications(rows: AdminPaymentHistoryRow[]): number {
  return rows.filter((row) =>
    requiresAdminVerification({
      paymentMethod: row.paymentMethod,
      gatewayProvider: row.gatewayProvider,
      status: row.status,
      adminDisposition: row.adminDisposition,
      bookingPaymentStatus: row.bookingPaymentStatus,
      verificationStatus: row.verificationStatus,
      transactionAckNumber: row.transactionAckNumber,
    }),
  ).length;
}
