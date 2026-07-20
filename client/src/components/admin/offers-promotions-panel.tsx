import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Share2, Ban, Tag, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { formatCouponDiscountLabel } from "@shared/coupons";

interface CouponSummary {
  id: string;
  code: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  classTypeId: string | null;
  classTypeName: string | null;
  classId: string | null;
  sessionLabel: string | null;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  status: string;
  createdByAdminName: string;
  notes: string | null;
  createdAt: string;
  isExpired: boolean;
  redemptionCount: number;
  totalDiscountPaise: number;
}

interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode: string;
  userName: string | null;
  userEmail: string | null;
  classTypeName: string | null;
  sessionDate: string | null;
  originalAmountPaise: number;
  discountAmountPaise: number;
  finalAmountPaise: number;
  redeemedAt: string;
}

interface ClassTypeOption {
  id: string;
  name: string;
}

interface AdminUserOption {
  id: string;
  name: string;
  email: string;
}

const COUPONS_KEY = "/api/admin/coupons";
const REDEMPTIONS_KEY = "/api/admin/coupons/redemptions";

function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fromLocalInputValue(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return d.toISOString();
}

function defaultCreateForm() {
  const inWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    discountType: "percent" as "fixed" | "percent",
    discountValue: "10",
    classTypeId: "",
    classId: "",
    expiresAt: toLocalInputValue(inWeek.toISOString()),
    maxUses: "",
    notes: "",
    otp: "",
  };
}

function couponStatusBadge(c: CouponSummary): { label: string; className: string } {
  if (c.status === "revoked") return { label: "Revoked", className: "bg-gray-200 text-gray-600" };
  if (c.isExpired) return { label: "Expired", className: "bg-gray-200 text-gray-500" };
  return { label: "Active", className: "bg-green-100 text-green-700" };
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export function OffersPromotionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [shareCoupon, setShareCoupon] = useState<CouponSummary | null>(null);
  const [form, setForm] = useState(defaultCreateForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shareUserIds, setShareUserIds] = useState<string[]>([]);
  const [shareChannels, setShareChannels] = useState({
    email: true,
    sms: false,
    whatsapp: false,
  });
  const [userSearch, setUserSearch] = useState("");

  const { data: coupons = [], isLoading } = useQuery<CouponSummary[]>({
    queryKey: [COUPONS_KEY],
    queryFn: async () => {
      const res = await fetch(COUPONS_KEY, { headers: adminHeaders(), credentials: "include" });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const { data: redemptions = [] } = useQuery<CouponRedemption[]>({
    queryKey: [REDEMPTIONS_KEY],
    queryFn: async () => {
      const res = await fetch(REDEMPTIONS_KEY, {
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const { data: otpHint } = useQuery<{ hint: string; devOtp?: string }>({
    queryKey: ["/api/admin/coupons/otp-hint"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons/otp-hint", {
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: classTypes = [] } = useQuery<ClassTypeOption[]>({
    queryKey: ["/api/class-types"],
    queryFn: async () => {
      const res = await fetch("/api/class-types");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: usersData } = useQuery<{ rows: AdminUserOption[] }>({
    queryKey: ["/api/admin/users", "coupon-share"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?page=1&pageSize=200", {
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filteredUsers = useMemo(() => {
    const rows = usersData?.rows ?? [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [usersData, userSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(COUPONS_KEY, {
        method: "POST",
        headers: adminHeaders(),
        credentials: "include",
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          classTypeId: form.classTypeId || null,
          classId: form.classId || null,
          expiresAt: fromLocalInputValue(form.expiresAt),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          notes: form.notes.trim() || null,
          otp: form.otp.trim(),
        }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon created" });
      setCreateOpen(false);
      setForm(defaultCreateForm());
      setFormErrors({});
      void queryClient.invalidateQueries({ queryKey: [COUPONS_KEY] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not create coupon", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}/revoke`, {
        method: "POST",
        headers: adminHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon revoked" });
      void queryClient.invalidateQueries({ queryKey: [COUPONS_KEY] });
    },
    onError: (err: Error) => {
      toast({ title: "Revoke failed", description: err.message, variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!shareCoupon) throw new Error("No coupon selected");
      const channels = (["email", "sms", "whatsapp"] as const).filter((c) => shareChannels[c]);
      const res = await fetch(`/api/admin/coupons/${shareCoupon.id}/share`, {
        method: "POST",
        headers: adminHeaders(),
        credentials: "include",
        body: JSON.stringify({ userIds: shareUserIds, channels }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: { results: Array<{ status: string }> }) => {
      const sent = data.results.filter((r) => r.status === "sent").length;
      const failed = data.results.length - sent;
      toast({
        title: "Share complete",
        description: `${sent} sent${failed ? `, ${failed} failed` : ""}.`,
      });
      setShareCoupon(null);
      setShareUserIds([]);
    },
    onError: (err: Error) => {
      toast({ title: "Share failed", description: err.message, variant: "destructive" });
    },
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const value = Number(form.discountValue);
    if (!form.discountValue || Number.isNaN(value) || value <= 0) {
      errors.discountValue = "Enter a valid discount";
    } else if (form.discountType === "percent" && (value < 1 || value > 100)) {
      errors.discountValue = "Percent must be 1-100";
    }
    if (!form.expiresAt) {
      errors.expiresAt = "Deadline is required";
    } else if (new Date(fromLocalInputValue(form.expiresAt)).getTime() <= Date.now()) {
      errors.expiresAt = "Deadline must be in the future";
    }
    if (!/^\d{6}$/.test(form.otp.trim())) {
      errors.otp = "Enter the 6-digit OTP";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const totals = useMemo(() => {
    const generated = coupons.length;
    const used = coupons.reduce((sum, c) => sum + c.redemptionCount, 0);
    const discountGiven = coupons.reduce((sum, c) => sum + c.totalDiscountPaise, 0);
    return { generated, used, discountGiven };
  }, [coupons]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Coupons generated</p>
          <p className="text-2xl font-bold">{totals.generated}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total redemptions</p>
          <p className="text-2xl font-bold">{totals.used}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Discount given</p>
          <p className="text-2xl font-bold">₹{(totals.discountGiven / 100).toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5" /> Offers &amp; Promotions
          </h3>
          <p className="text-sm text-muted-foreground">
            Create coupon codes, share with members, and track usage for cash-flow housekeeping.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: [COUPONS_KEY] });
              void queryClient.invalidateQueries({ queryKey: [REDEMPTIONS_KEY] });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Create coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create coupon code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground rounded-md bg-amber-50 border border-amber-200 p-2">
                  {otpHint?.hint}
                  {otpHint?.devOtp ? ` Dev OTP: ${otpHint.devOtp}` : ""}
                </p>
                <div>
                  <Label>Coupon code (optional, auto-generated if blank)</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. YOGA20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Discount type</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                      value={form.discountType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discountType: e.target.value as "fixed" | "percent",
                        }))
                      }
                    >
                      <option value="percent">Percentage off</option>
                      <option value="fixed">Fixed amount off (₹)</option>
                    </select>
                  </div>
                  <div>
                    <Label>{form.discountType === "percent" ? "Percent (1-100)" : "Amount (₹)"}</Label>
                    <Input
                      type="number"
                      min={form.discountType === "percent" ? 1 : 1}
                      max={form.discountType === "percent" ? 100 : undefined}
                      value={form.discountValue}
                      onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                      className={formErrors.discountValue ? "border-red-500" : ""}
                    />
                    {formErrors.discountValue && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.discountValue}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Applicable session type (optional)</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    value={form.classTypeId}
                    onChange={(e) => setForm((f) => ({ ...f, classTypeId: e.target.value }))}
                  >
                    <option value="">Any session type</option>
                    {classTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>
                    Expiry deadline <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    step={1}
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className={formErrors.expiresAt ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Coupon stops working at this exact second, not one moment later.
                  </p>
                  {formErrors.expiresAt && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.expiresAt}</p>
                  )}
                </div>
                <div>
                  <Label>Max uses (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label>Internal notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>
                    Finance OTP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.otp}
                    onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className={formErrors.otp ? "border-red-500" : ""}
                  />
                  {formErrors.otp && <p className="text-xs text-red-500 mt-1">{formErrors.otp}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!validateForm()) return;
                    createMutation.mutate();
                  }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating…" : "Create coupon"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="py-2 px-3">Code</th>
              <th className="py-2 px-3">Discount</th>
              <th className="py-2 px-3">Session</th>
              <th className="py-2 px-3">Expires</th>
              <th className="py-2 px-3">Used</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  Loading coupons…
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  No coupons yet. Create one to get started.
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const badge = couponStatusBadge(c);
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 px-3 font-mono font-semibold">{c.code}</td>
                    <td className="py-2 px-3">
                      {formatCouponDiscountLabel(c.discountType, c.discountValue)}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {c.sessionLabel ?? c.classTypeName ?? "All sessions"}
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap">
                      {formatDeadline(c.expiresAt)}
                    </td>
                    <td className="py-2 px-3">
                      {c.redemptionCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                      {c.totalDiscountPaise > 0 && (
                        <p className="text-xs text-muted-foreground">
                          −₹{(c.totalDiscountPaise / 100).toLocaleString("en-IN")}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={c.status !== "active" || c.isExpired}
                          onClick={() => {
                            setShareCoupon(c);
                            setShareUserIds([]);
                            setShareChannels({ email: true, sms: false, whatsapp: false });
                          }}
                        >
                          <Share2 className="w-3 h-3 mr-1" /> Share
                        </Button>
                        {c.status === "active" && !c.isExpired && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Ban className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke {c.code}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This coupon will stop working immediately for all members.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeMutation.mutate(c.id)}
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Redemption history</h4>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="py-2 px-3">Coupon</th>
                <th className="py-2 px-3">Member</th>
                <th className="py-2 px-3">Session</th>
                <th className="py-2 px-3">Original</th>
                <th className="py-2 px-3">Discount</th>
                <th className="py-2 px-3">Paid</th>
                <th className="py-2 px-3">Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    No redemptions yet.
                  </td>
                </tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 px-3 font-mono">{r.couponCode}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium">{r.userName ?? "None"}</p>
                      <p className="text-xs text-muted-foreground">{r.userEmail}</p>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {r.classTypeName ?? "None"}
                      {r.sessionDate && (
                        <p className="text-muted-foreground">
                          {new Date(r.sessionDate).toLocaleString("en-IN")}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      ₹{(r.originalAmountPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-green-700">
                      −₹{(r.discountAmountPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3">
                      ₹{(r.finalAmountPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap">
                      {formatDeadline(r.redeemedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!shareCoupon} onOpenChange={(open) => !open && setShareCoupon(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share coupon {shareCoupon?.code}</DialogTitle>
          </DialogHeader>
          {shareCoupon && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Members receive instructions, applicable session, and expiry deadline via the
                selected channels.
              </p>
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p>
                  <strong>Discount:</strong>{" "}
                  {formatCouponDiscountLabel(shareCoupon.discountType, shareCoupon.discountValue)}
                </p>
                <p>
                  <strong>Session:</strong>{" "}
                  {shareCoupon.sessionLabel ?? shareCoupon.classTypeName ?? "All eligible sessions"}
                </p>
                <p>
                  <strong>Expires:</strong> {formatDeadline(shareCoupon.expiresAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {(["email", "sms", "whatsapp"] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 capitalize">
                    <Checkbox
                      checked={shareChannels[ch]}
                      onCheckedChange={(v) =>
                        setShareChannels((s) => ({ ...s, [ch]: v === true }))
                      }
                    />
                    {ch}
                  </label>
                ))}
              </div>
              <div>
                <Label>Search members</Label>
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Name or email"
                  className="mt-1"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {filteredUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm py-1">
                    <Checkbox
                      checked={shareUserIds.includes(u.id)}
                      onCheckedChange={(checked) => {
                        setShareUserIds((ids) =>
                          checked ? [...ids, u.id] : ids.filter((id) => id !== u.id),
                        );
                      }}
                    />
                    <span>
                      {u.name} <span className="text-muted-foreground">({u.email})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={
                shareMutation.isPending ||
                shareUserIds.length === 0 ||
                !Object.values(shareChannels).some(Boolean)
              }
            >
              {shareMutation.isPending ? "Sending…" : "Send to members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
