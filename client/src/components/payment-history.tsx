import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import { PAYMENT_DISPOSITION_LABELS, type PaymentDisposition } from "@shared/payment-gateway";
import { useToast } from "@/hooks/use-toast";

interface PaymentHistoryRow {
  id: string;
  className: string;
  sessionDate: string;
  amountPaise: number | null;
  currency: string;
  gatewayReference: string | null;
  payerName: string | null;
  payerPhone: string | null;
  adminDisposition: PaymentDisposition;
  paidAt: string | null;
  createdAt: string;
  receiptUrl: string | null;
}

const dispositionColors: Record<PaymentDisposition, string> = {
  pending: "bg-amber-100 text-amber-800",
  received: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  dispute: "bg-purple-100 text-purple-800",
};

function formatAmount(paise: number | null, currency: string): string {
  if (paise == null) return "N/A";
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function PaymentHistory() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/payments/my", {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await readResponseJson<PaymentHistoryRow[]>(res);
        if (!res.ok) throw new Error("Failed to load");
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) {
          toast({
            title: "Could not load payment history",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-orange-50">
        <CardTitle className="flex items-center gap-3 text-purple-800">
          <CreditCard className="h-6 w-6 text-purple-600" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <p className="text-center text-purple-600 py-8">Loading payments…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No payment transactions yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border border-purple-100 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-purple-800">{row.className}</p>
                  <p className="text-sm text-purple-600">
                    {format(new Date(row.sessionDate), "MMM d, yyyy · HH:mm")}
                  </p>
                  <p className="text-sm mt-1">{formatAmount(row.amountPaise, row.currency)}</p>
                  {row.gatewayReference && (
                    <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                      Ref: {row.gatewayReference}
                    </p>
                  )}
                  {(row.payerName || row.payerPhone) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[row.payerName, row.payerPhone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <Badge className={dispositionColors[row.adminDisposition]}>
                    {PAYMENT_DISPOSITION_LABELS[row.adminDisposition]}
                  </Badge>
                  {row.paidAt && (
                    <span className="text-xs text-muted-foreground">
                      Paid {format(new Date(row.paidAt), "MMM d, yyyy")}
                    </span>
                  )}
                  {row.receiptUrl && (
                    <a
                      href={row.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#401e9c] underline"
                    >
                      View receipt
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
