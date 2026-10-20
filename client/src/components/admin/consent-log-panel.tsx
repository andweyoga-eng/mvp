import { useQuery } from "@tanstack/react-query";
import { adminHeaders } from "@/lib/admin-api";

type ConsentLogRow = {
  id: string;
  userId: string | null;
  bookingId: string | null;
  consentType: string;
  action: string;
  consentVersion: string;
  timestampUtc: string;
};

export function ConsentLogPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "consent-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/consent-logs", {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load consent logs");
      return res.json() as Promise<ConsentLogRow[]>;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading consent logs…</p>;
  if (error) return <p className="text-sm text-destructive">Could not load consent logs.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Append-only audit trail (read-only). Rows cannot be edited or deleted from this view.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Time (UTC)</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Version</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.timestampUtc).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-3 py-2">{row.consentType}</td>
                <td className="px-3 py-2">{row.action}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.userId ?? "N/A"}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.bookingId ?? "N/A"}</td>
                <td className="px-3 py-2">{row.consentVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
