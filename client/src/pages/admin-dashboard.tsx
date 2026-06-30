import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, UserCheck, UserX, LogOut, BarChart3, AlertCircle,
  CheckCircle, Clock, FileText, Plus, GraduationCap,
  Calendar, X, Settings, History, Layers, QrCode, CreditCard, Shield,
  GalleryHorizontalEnd
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders } from "@/lib/admin-api";
import {
  CreateSessionModal,
  type AdminClassSessionForEdit,
} from "@/components/admin/create-session-modal";
import {
  adminNavTabTrigger,
  adminSectionTabTrigger,
  adminActionTabTrigger,
} from "@/lib/admin-tab-styles";
import { WeekScheduleGrid, startOfWeek } from "@/components/admin/week-schedule-grid";
import { CancelSessionDialog } from "@/components/admin/cancel-session-dialog";
import { SessionHistoryList } from "@/components/admin/session-history-list";
import { getSessionEndMs } from "@shared/schedule-display";
import { SessionTypesPanel } from "@/components/admin/session-types-panel";
import { CarouselPromotionsPanel } from "@/components/admin/carousel-promotions-panel";
import {
  PaymentQrCodesPanel,
  QrCodesCreateToolbar,
  type PaymentQrCode,
} from "@/components/admin/payment-qr-codes-panel";
import {
  PaymentHistoryPanel,
  adminPaymentHistoryQueryOptions,
  countPendingPaymentVerifications,
  type AdminPaymentHistoryRow,
} from "@/components/admin/payment-history-panel";
import { AdminDataInsightsPanel } from "@/components/admin/admin-data-insights-panel";
import {
  CreateInstructorModal,
  EditInstructorModal,
  InstructorStatusActions,
} from "@/components/admin/create-instructor-modal";
import type { Instructor } from "@shared/schema";
import {
  canInstructorTakeSessions,
  getInstructorStatusLabel,
  getInstructorEmailVerificationLabel,
  isInstructorFullyOnboarded,
  showManuallyVerifiedBadge,
} from "@shared/instructor-compliance";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface User {
  id: string; email: string; name: string; emailVerified: boolean;
  isActive?: boolean; sessionAttendanceCount?: number;
  healthUpdateText: string | null; healthDocumentUrls: string[] | null;
  completeness: {
    isComplete: boolean; healthUpdateComplete: boolean; documentsComplete: boolean;
    emailVerified: boolean; completionPercentage: number; flags: string[];
  };
}
interface AdminUsersResponse {
  users: User[]; totalUsers: number; completeProfiles: number; incompleteProfiles: number;
}
interface ClassType {
  id: string; name: string; description: string; price: string; duration: number; imageUrl: string | null; intensity: string;
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
  paymentMethod?: string | null;
  paymentQrCodeId?: string | null;
  qrContactPhone?: string | null;
  qrContactEmail?: string | null;
  status?: string;
  publishedAt?: string | null;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: string | null;
  seriesId?: string | null;
  seriesWeekCount?: number | null;
  classType?: { name: string };
  instructor?: { name: string };
}
interface AdminProfile {
  id: string;
  email: string;
  phone: string;
  governmentIdImageUrl: string | null;
  verificationStatus: string;
}
interface SubscriptionSummary {
  id: string;
  userName: string;
  userEmail: string;
  classTypeName: string;
  subscriptionType: string;
  totalAmountPaise: number;
  totalSessions: number;
  utilizedSessions: number;
  refundedSessions: number;
  disputedSessions: number;
  disputesResolved: number;
  waivedSessions: number;
  status: string;
}
interface AdminWaitlistUser {
  id: string;
  classTypeName: string;
  userName: string | null;
  email: string;
  source: string;
  emailSendStatus: string | null;
  emailSendError: string | null;
  emailSendCount: number;
  lastEmailedAt: string | null;
  createdAt: string;
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!admin) { setLocation("/admin/login"); return null; }

  const { data: usersData, isLoading: usersLoading, error: usersError, refetch: refetchUsers } =
    useQuery<AdminUsersResponse>({
      queryKey: ["/api/admin/users"],
      queryFn: async () => {
        const res = await fetch("/api/admin/users", { headers: adminHeaders() });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    });

  const { data: classTypes = [], isLoading: ctLoading, refetch: refetchCT } =
    useQuery<ClassType[]>({
      queryKey: ["/api/class-types"],
      queryFn: async () => {
        const res = await fetch("/api/class-types");
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const { data: instructors = [], isLoading: insLoading, refetch: refetchIns } =
    useQuery<Instructor[]>({
      queryKey: ["/api/admin/instructors"],
      queryFn: async () => {
        const res = await fetch("/api/admin/instructors", { headers: adminHeaders() });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const sessionInstructorOptions = instructors.map((i) => ({
    id: i.id,
    name: i.name,
    disabled: !canInstructorTakeSessions(i),
  }));
  const eligibleInstructorCount = sessionInstructorOptions.filter((i) => !i.disabled).length;

  const { data: sessions = [], isLoading: sessLoading, refetch: refetchSess } =
    useQuery<ClassSession[]>({
      queryKey: ["/api/admin/classes"],
      queryFn: async () => {
        const res = await fetch("/api/admin/classes", { headers: adminHeaders() });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const { data: paymentQrCodes = [], isLoading: qrLoading, refetch: refetchQr } =
    useQuery<PaymentQrCode[]>({
      queryKey: ["/api/admin/payment-qr-codes"],
      queryFn: async () => {
        const res = await fetch("/api/admin/payment-qr-codes", { headers: adminHeaders() });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const { data: paymentHistory = [] } = useQuery<AdminPaymentHistoryRow[]>(
    adminPaymentHistoryQueryOptions,
  );

  const pendingPaymentVerifications = countPendingPaymentVerifications(paymentHistory);
  const { data: adminProfileData, refetch: refetchAdminProfile } = useQuery<{
    profile: AdminProfile | null;
    fallback: { email: string; phone: string };
  }>({
    queryKey: ["/api/admin/profile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profile", { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: subscriptions = [] } = useQuery<SubscriptionSummary[]>({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subscriptions", { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: waitlistUsers = [], refetch: refetchWaitlist } = useQuery<AdminWaitlistUser[]>({
    queryKey: ["/api/admin/waitlist-users"],
      queryFn: async () => {
      const res = await fetch("/api/admin/waitlist-users", { headers: adminHeaders() });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  async function toggleUserActive(userId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ isActive }),
    });
    if (!res.ok) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: isActive ? "User activated" : "User deactivated" });
    refetchUsers();
  }

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out" });
    setLocation("/admin/login");
  };

  const openCreateSession = () => {
    setSessionToEdit(null);
    setSessionEditorOpen(true);
  };

  const openEditSession = (session: AdminClassSessionForEdit) => {
    setSessionToEdit(session);
    setSessionEditorOpen(true);
  };

  function openCancelOrDeleteSession(session: {
    id: string;
    date: string;
    currentBookings?: number;
    classType?: { name: string };
  }) {
    const bookingCount = session.currentBookings ?? 0;
    const label = `${session.classType?.name ?? "Session"} · ${new Date(session.date).toLocaleString("en-IN")}`;
    if (bookingCount > 0) {
      setSessionToCancel({ id: session.id, label, bookingCount });
      setCancelDialogOpen(true);
      return;
    }
    void handleDeleteSession(session.id);
  }

  function handleDeleteSession(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId);
    const bookingCount = session?.currentBookings ?? 0;
    if (bookingCount > 0) {
      const label = session?.classType?.name
        ? `${session.classType.name} · ${new Date(session.date).toLocaleString("en-IN")}`
        : "This session";
      setSessionToCancel({ id: sessionId, label, bookingCount });
      setCancelDialogOpen(true);
      return;
    }
    if (!confirm("Delete this session? This cannot be undone.")) return;
    void performDeleteSession(sessionId);
  }

  async function performDeleteSession(sessionId: string) {
    const res = await fetch(`/api/admin/classes/${sessionId}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Could not delete",
        description: body.message || "Delete failed",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Session deleted" });
    refetchSess();
  }

  // DEAD-01 FIX: performCancelSession removed — was defined but never called.

  async function handleCancelSessionWithBookings(payload: {
    reason: string;
    ownerOtp: string;
  }) {
    if (!sessionToCancel) return;
    const res = await fetch(`/api/admin/classes/${sessionToCancel.id}/cancel`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Could not cancel session",
        description: body.message || "Cancellation failed",
        variant: "destructive",
      });
      throw new Error(body.message || "Cancellation failed");
    }
    toast({ title: "Session cancelled", description: body.message });
    setSessionToCancel(null);
    refetchSess();
  }

  const getCompletenessColor = (pct: number) =>
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

  const now = Date.now();
  const [sessionsSubTab, setSessionsSubTab] = useState("manage");
  const [sessionEditorOpen, setSessionEditorOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<AdminClassSessionForEdit | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<{
    id: string;
    label: string;
    bookingCount: number;
  } | null>(null);
  const [scheduleWeekAnchor, setScheduleWeekAnchor] = useState<Date | undefined>(undefined);

  const sessionEndMs = (s: { date: string; classType?: { duration?: number } }) =>
    getSessionEndMs(s.date, s.classType?.duration);

  const upcomingSessions = sessions.filter((s) => sessionEndMs(s) >= now);
  const pastSessions = sessions
    .filter((s) => sessionEndMs(s) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#3d1b80]">andWeYoga</span>
            <span className="text-gray-400 text-sm">Admin</span>
            <Badge variant="secondary" className="text-xs">{admin.role}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">Welcome, {admin.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="insights">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 bg-white border p-1">
            <TabsTrigger
              value="insights"
              className="data-[state=active]:bg-[#3d1b80] data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2 shrink-0" /> Data and Insights
            </TabsTrigger>
            <TabsTrigger value="users" className={adminNavTabTrigger}>
              <Users className="w-4 h-4 mr-2 shrink-0" /> Users
            </TabsTrigger>
            <TabsTrigger value="instructors" className={adminNavTabTrigger}>
              <GraduationCap className="w-4 h-4 mr-2 shrink-0" /> Instructors
            </TabsTrigger>
            <TabsTrigger value="sessions" className={adminNavTabTrigger}>
              <Calendar className="w-4 h-4 mr-2 shrink-0" /> Sessions
            </TabsTrigger>
            <TabsTrigger
              value="payment-history"
              className={`${adminNavTabTrigger}${pendingPaymentVerifications > 0 ? " ring-2 ring-[#bb5309] ring-offset-1 animate-pulse" : ""}`}
            >
              <CreditCard className="w-4 h-4 mr-2 shrink-0" /> Payment History
              {pendingPaymentVerifications > 0 && (
                <Badge className="ml-2 bg-[#bb5309] text-white">
                  {pendingPaymentVerifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="qr-codes" className={adminNavTabTrigger}>
              <QrCode className="w-4 h-4 mr-2 shrink-0" /> QR Codes
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className={adminNavTabTrigger}>
              <CreditCard className="w-4 h-4 mr-2 shrink-0" /> Subscription Management
            </TabsTrigger>
            <TabsTrigger value="admin-profile" className={adminNavTabTrigger}>
              <Shield className="w-4 h-4 mr-2 shrink-0" /> Admin Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights">
            <AdminDataInsightsPanel
              stats={{
                totalUsers: usersData?.totalUsers ?? 0,
                completeProfiles: usersData?.completeProfiles ?? 0,
                incompleteProfiles: usersData?.incompleteProfiles ?? 0,
                upcomingSessions: upcomingSessions.length,
              }}
            />
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#3d1b80]" /> User Management
                  </CardTitle>
                  <CardDescription>Profile completeness and health data compliance</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
                    <span className="ml-3 text-gray-500">Loading users...</span>
                  </div>
                ) : usersError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Failed to load users. Please refresh.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {usersData?.users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            {user.completeness.isComplete ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" /> Complete
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                <Clock className="w-3 h-3 mr-1" /> Incomplete
                              </Badge>
                            )}
                          </div>
                          {user.completeness.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.completeness.flags.map((flag, i) => (
                                <Badge key={i} variant="destructive" className="text-xs">
                                  <X className="w-2 h-2 mr-1" />{flag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
                          {user.sessionAttendanceCount != null && (
                            <Badge variant="outline" className="text-xs" title="Shadow attendance (Meet link opens)">
                              Sessions: {user.sessionAttendanceCount}
                            </Badge>
                          )}
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${getCompletenessColor(user.completeness.completionPercentage)}`}
                                  style={{ width: `${user.completeness.completionPercentage}%` }} />
                              </div>
                              <span className="text-sm font-semibold w-8 text-right">{user.completeness.completionPercentage}%</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              {user.completeness.emailVerified && <CheckCircle className="w-3 h-3 text-green-500" title="Email verified" />}
                              {user.completeness.healthUpdateComplete && <FileText className="w-3 h-3 text-blue-500" title="Health complete" />}
                              {user.completeness.documentsComplete && <Settings className="w-3 h-3 text-purple-500" title="Docs complete" />}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => toggleUserActive(user.id, !(user.isActive ?? true))}>
                              {(user.isActive ?? true) ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7" disabled
                              title="Soft remove uses Deactivate. Hard delete & bulk Excel — coming soon.">
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!usersData?.users.length && (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No users registered yet</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSTRUCTORS */}
          <TabsContent value="instructors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#3d1b80]" /> Instructors
                  </CardTitle>
                  <CardDescription>Certified practitioners ({instructors.length} total)</CardDescription>
                </div>
                  <CreateInstructorModal onCreated={() => refetchIns()} />
              </CardHeader>
              <CardContent>
                {insLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
                  </div>
                ) : (
                  <>
                    {instructors.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No instructors yet</p>
                        <p className="text-sm mt-1">Add instructors before scheduling sessions</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {instructors.map(ins => (
                        <div key={ins.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            {ins.imageUrl ? (
                              <img src={ins.imageUrl} alt={ins.name}
                                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-[#f5f0ff] flex items-center justify-center flex-shrink-0">
                                <span className="text-[#3d1b80] font-bold text-lg">{ins.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {isInstructorFullyOnboarded(ins) ? (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs shrink-0">
                                    Onboarded
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant={
                                      ins.status === "pending"
                                        ? "secondary"
                                        : ins.status === "active"
                                          ? "default"
                                          : "destructive"
                                    }
                                    className={
                                      ins.status === "active"
                                        ? "bg-green-700 hover:bg-green-700 text-xs shrink-0"
                                        : "text-xs shrink-0"
                                    }
                                    title={ins.statusNotes ?? undefined}
                                  >
                                    {getInstructorStatusLabel(ins.status)}
                                  </Badge>
                                )}
                                {showManuallyVerifiedBadge(ins) ? (
                                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border border-amber-300 text-xs shrink-0">
                                    Manually Verified
                                  </Badge>
                                ) : null}
                                <h3 className="font-semibold text-gray-900">{ins.name}</h3>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{ins.email} · {ins.phone}</p>
                              {ins.emailVerified ? (
                                <p className="text-xs text-gray-500 mt-1">
                                  Email verification:{" "}
                                  <span
                                    className={
                                      ins.verificationMethod === "admin-override"
                                        ? "text-amber-700 font-medium"
                                        : "text-green-700 font-medium"
                                    }
                                  >
                                    {getInstructorEmailVerificationLabel(ins.verificationMethod)}
                                  </span>
                                </p>
                              ) : null}
                              {ins.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ins.bio}</p>}
                              {ins.specialties && ins.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {ins.specialties.map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <EditInstructorModal
                                  instructor={ins}
                                  onUpdated={() => {
                                    void refetchIns();
                                    qc.invalidateQueries({ queryKey: ["/api/admin/instructors"] });
                                    qc.invalidateQueries({ queryKey: ["/api/admin/instructors/eligible"] });
                                  }}
                                />
                                <InstructorStatusActions instructor={ins} onUpdated={() => {
                                  refetchIns();
                                  qc.invalidateQueries({ queryKey: ["/api/admin/instructors/eligible"] });
                                }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SESSIONS */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#bb5309]" /> Sessions
                </CardTitle>
                <CardDescription>
                  Schedule upcoming sessions, review history, and manage session types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={sessionsSubTab}
                  onValueChange={setSessionsSubTab}
                  className="w-full"
                >
                  <TabsList className="mb-3 grid h-auto w-full grid-cols-2 gap-1 bg-gray-100 p-1 sm:flex sm:flex-wrap sm:justify-start">
                    <TabsTrigger
                      value="manage"
                      className={`col-span-2 sm:col-span-1 ${adminSectionTabTrigger}`}
                    >
                      <Calendar className="w-4 h-4 mr-2 shrink-0" /> Manage Session
                    </TabsTrigger>
                    <TabsTrigger value="history" className={adminSectionTabTrigger}>
                      <History className="w-4 h-4 mr-2" /> Session History
                    </TabsTrigger>
                    <TabsTrigger value="session-types" className={adminSectionTabTrigger}>
                      <Layers className="w-4 h-4 mr-2" /> Session Type
                    </TabsTrigger>
                    <TabsTrigger value="carousel" className={adminSectionTabTrigger}>
                      <GalleryHorizontalEnd className="w-4 h-4 mr-2" /> Carousel
                    </TabsTrigger>
                    <TabsTrigger value="waitlisted-users" className={adminSectionTabTrigger}>
                      <Users className="w-4 h-4 mr-2" /> Wait Listed users
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manage">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
                      <Button
                        size="sm"
                        className="w-full bg-[#bb5309] hover:bg-[#9a4508] text-white sm:w-auto"
                        onClick={openCreateSession}
                        data-testid="open-create-session-flow"
                      >
                        <Plus className="w-4 h-4 mr-2" /> New session
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      Upcoming sessions ({upcomingSessions.length}) — edit or delete from the week view
                    </p>
                    {sessLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <WeekScheduleGrid
                            sessions={upcomingSessions}
                            weekStart={scheduleWeekAnchor}
                            onWeekStartChange={setScheduleWeekAnchor}
                            onEditSession={openEditSession}
                            onDeleteSession={openCancelOrDeleteSession}
                          />
                        </div>
                        {upcomingSessions.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No upcoming sessions</p>
                            <p className="text-sm mt-1">
                              Click New session to schedule your next class.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <CreateSessionModal
                      classTypes={classTypes}
                      instructors={sessionInstructorOptions}
                      paymentQrCodes={paymentQrCodes}
                      adminDefaultPhone={adminProfileData?.profile?.phone ?? ""}
                      open={sessionEditorOpen}
                      onOpenChange={setSessionEditorOpen}
                      sessionToEdit={sessionToEdit}
                      showTrigger={false}
                      onCreated={(result) => {
                        void refetchSess();
                        refetchCT();
                        setSessionToEdit(null);
                        const first = result?.sessions?.[0]?.date;
                        if (first) {
                          setScheduleWeekAnchor(startOfWeek(new Date(first)));
                        }
                        qc.invalidateQueries({ queryKey: ["/api/schedule/week"] });
                        qc.invalidateQueries({ queryKey: ["/api/admin/classes"] });
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="history">
                    <p className="text-sm text-muted-foreground mb-4">
                        Past sessions ({pastSessions.length})
                      </p>
                    {sessLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
                      </div>
                    ) : (
                      <SessionHistoryList
                        sessions={pastSessions}
                        classTypes={classTypes}
                        instructors={sessionInstructorOptions}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="session-types">
                    <SessionTypesPanel
                      classTypes={classTypes}
                      isLoading={ctLoading}
                      onDataChange={() => refetchCT()}
                    />
                  </TabsContent>

                  <TabsContent value="carousel">
                    <CarouselPromotionsPanel sessions={upcomingSessions} />
                  </TabsContent>

                  <TabsContent value="waitlisted-users">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Waitlisted users and email notification status
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetchWaitlist()}>
                        Refresh
                      </Button>
                    </div>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 px-3">Session Type</th>
                            <th className="py-2 px-3">User</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3">Requested</th>
                            <th className="py-2 px-3">Email status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitlistUsers.map((row) => (
                            <tr key={row.id} className="border-b">
                              <td className="py-2 px-3">{row.classTypeName}</td>
                              <td className="py-2 px-3">
                                {row.userName ?? "Guest"}{" "}
                                <span className="text-xs text-muted-foreground">({row.source})</span>
                              </td>
                              <td className="py-2 px-3">{row.email}</td>
                              <td className="py-2 px-3">
                                {new Date(row.createdAt).toLocaleString("en-IN")}
                              </td>
                              <td className="py-2 px-3">
                                <Badge
                                  variant={row.emailSendStatus === "sent" ? "default" : "secondary"}
                                >
                                  {row.emailSendStatus ?? "pending"}
                                </Badge>
                                {row.lastEmailedAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last sent: {new Date(row.lastEmailedAt).toLocaleString("en-IN")}
                                  </p>
                                )}
                                {row.emailSendError && (
                                  <p className="text-xs text-destructive mt-1">{row.emailSendError}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {waitlistUsers.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground">No waitlisted users yet.</div>
                      )}
                    </div>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-history">
            <PaymentHistoryPanel />
          </TabsContent>

          <TabsContent value="qr-codes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#3d1b80]" /> QR Codes
                </CardTitle>
                <CardDescription>
                  Create and manage reusable payment QR assets. Verify QR payments under Payment
                  History.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QrCodesCreateToolbar onCreated={() => refetchQr()} />
                <PaymentQrCodesPanel
                  qrCodes={paymentQrCodes}
                  isLoading={qrLoading}
                  onDataChange={() => refetchQr()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Track drop-in, trial, and recurring usage, disputes, refunds, and waivers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3">Member</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Session Type</th>
                        <th className="py-2 pr-3">Paid</th>
                        <th className="py-2 pr-3">Used/Total</th>
                        <th className="py-2 pr-3">Refunded</th>
                        <th className="py-2 pr-3">Dispute</th>
                        <th className="py-2 pr-3">Waived</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="py-2 pr-3">
                            <p className="font-medium">{s.userName}</p>
                            <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                          </td>
                          <td className="py-2 pr-3 capitalize">{s.subscriptionType.replace("_", " ")}</td>
                          <td className="py-2 pr-3">{s.classTypeName}</td>
                          <td className="py-2 pr-3">₹{(s.totalAmountPaise / 100).toLocaleString("en-IN")}</td>
                          <td className="py-2 pr-3">{s.utilizedSessions}/{s.totalSessions}</td>
                          <td className="py-2 pr-3">{s.refundedSessions}</td>
                          <td className="py-2 pr-3">{s.disputedSessions}/{s.disputesResolved}</td>
                          <td className="py-2 pr-3">{s.waivedSessions}</td>
                          <td className="py-2 pr-3 capitalize">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-profile">
            <Card>
              <CardHeader>
                <CardTitle>Admin Profile & ID Verification</CardTitle>
                <CardDescription>
                  Required before creating sessions. DigiLocker/Aadhaar integration placeholder is planned.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm"><strong>Email:</strong> {adminProfileData?.profile?.email ?? adminProfileData?.fallback.email}</p>
                <p className="text-sm"><strong>Phone:</strong> {adminProfileData?.profile?.phone ?? "Not set"}</p>
                <p className="text-sm"><strong>ID status:</strong> {adminProfileData?.profile?.verificationStatus ?? "pending"}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      const email = prompt("Admin email", adminProfileData?.profile?.email ?? adminProfileData?.fallback.email ?? "");
                      const phone = prompt("Admin phone (10 digits)", adminProfileData?.profile?.phone ?? "");
                      const govId = prompt("Government ID image URL or data URL (<=1MB)", adminProfileData?.profile?.governmentIdImageUrl ?? "");
                      if (!email || !phone) return;
                      const res = await fetch("/api/admin/profile", {
                        method: "PUT",
                        headers: adminHeaders(),
                        body: JSON.stringify({ email, phone, governmentIdImageUrl: govId || null }),
                      });
                      if (!res.ok) {
                        const b = await res.json().catch(() => ({}));
                        toast({ title: "Could not save profile", description: b.message, variant: "destructive" });
                        return;
                      }
                      toast({ title: "Admin profile saved" });
                      refetchAdminProfile();
                    }}
                  >
                    Create/Update Admin Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch("/api/admin/profile/verify-id", {
                        method: "POST",
                        headers: adminHeaders(),
                        body: JSON.stringify({ notes: "Manual verification completed" }),
                      });
                      if (!res.ok) {
                        toast({ title: "Verification failed", variant: "destructive" });
                        return;
                      }
                      toast({ title: "Government ID verified (manual)" });
                      refetchAdminProfile();
                    }}
                  >
                    Verify Government ID
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <CancelSessionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        sessionLabel={sessionToCancel?.label ?? "Session"}
        bookingCount={sessionToCancel?.bookingCount ?? 0}
        onConfirm={handleCancelSessionWithBookings}
      />
    </div>
  );
}
