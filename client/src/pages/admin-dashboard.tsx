import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserCheck, UserX, LogOut, BarChart3, AlertCircle,
  CheckCircle, Clock, FileText, Plus, BookOpen, GraduationCap,
  Calendar, RefreshCw, X, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface User {
  id: string; email: string; name: string; emailVerified: boolean;
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
  id: string; name: string; description: string; price: string; duration: number; imageUrl: string | null;
}
interface Instructor {
  id: string; name: string; bio: string | null; imageUrl: string | null; specialties: string[] | null;
}
interface ClassSession {
  id: string; classTypeId: string; instructorId: string; date: string;
  maxCapacity: number; currentBookings: number;
  googleMeetLink?: string | null; razorpayLink?: string | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function adminHeaders() {
  const token = localStorage.getItem("adminToken");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  }) + " IST";
}

// ─── CREATE CLASS TYPE MODAL ───────────────────────────────────────────────────

function CreateClassTypeModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration: "60", imageUrl: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/class-types", {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({
          name: data.name.trim(), description: data.description.trim(),
          price: parseFloat(data.price), duration: parseInt(data.duration),
          imageUrl: data.imageUrl.trim() || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Class type created", description: `${form.name} added.` });
      setForm({ name: "", description: "", price: "", duration: "60", imageUrl: "" });
      setErrors({}); setOpen(false); onCreated();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) e.price = "Enter a valid price";
    if (!form.duration || isNaN(parseInt(form.duration)) || parseInt(form.duration) <= 0) e.duration = "Enter a valid duration";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Class Type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Class Type</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (validate()) mutation.mutate(form); }} className="space-y-4 mt-2">
          <div>
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Hatha Yoga" className={errors.name ? "border-red-500" : ""} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this yoga style..." rows={3}
              className={errors.description ? "border-red-500" : ""} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price (INR) <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="500" className={errors.price ? "border-red-500" : ""} />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
            <div>
              <Label>Duration (minutes) <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="60" className={errors.duration ? "border-red-500" : ""} />
              {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
            </div>
          </div>
          <div>
            <Label>Image URL <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
              {mutation.isPending ? "Creating..." : "Create Class Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CREATE INSTRUCTOR MODAL ───────────────────────────────────────────────────

function CreateInstructorModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", imageUrl: "", specialties: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const specialtiesArr = data.specialties.trim()
        ? data.specialties.split(",").map(s => s.trim()).filter(Boolean) : [];
      const res = await fetch("/api/instructors", {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({
          name: data.name.trim(), bio: data.bio.trim() || null,
          imageUrl: data.imageUrl.trim() || null,
          specialties: specialtiesArr.length > 0 ? specialtiesArr : null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Instructor created", description: `${form.name} added.` });
      setForm({ name: "", bio: "", imageUrl: "", specialties: "" });
      setErrors({}); setOpen(false); onCreated();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Instructor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Instructor</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (validate()) mutation.mutate(form); }} className="space-y-4 mt-2">
          <div>
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Patel" className={errors.name ? "border-red-500" : ""} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label>Bio <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Brief bio about the instructor..." rows={3} />
          </div>
          <div>
            <Label>Photo URL <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..." />
          </div>
          <div>
            <Label>Specialties <span className="text-gray-400 text-xs">(optional, comma-separated)</span></Label>
            <Input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}
              placeholder="e.g. Hatha Yoga, Meditation, Pranayama" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
              {mutation.isPending ? "Creating..." : "Create Instructor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CREATE SESSION MODAL ──────────────────────────────────────────────────────

function CreateSessionModal({ classTypes, instructors, onCreated }: {
  classTypes: ClassType[]; instructors: Instructor[]; onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    classTypeId: "", instructorId: "", date: "",
    maxCapacity: "20", googleMeetLink: "", razorpayLink: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/classes", {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({
          classTypeId: data.classTypeId, instructorId: data.instructorId,
          date: new Date(data.date).toISOString(),
          maxCapacity: parseInt(data.maxCapacity),
          googleMeetLink: data.googleMeetLink.trim() || null,
          razorpayLink: data.razorpayLink.trim() || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session scheduled", description: "Session has been created." });
      setForm({ classTypeId: "", instructorId: "", date: "", maxCapacity: "20", googleMeetLink: "", razorpayLink: "" });
      setErrors({}); setOpen(false); onCreated();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.classTypeId) e.classTypeId = "Select a class type";
    if (!form.instructorId) e.instructorId = "Select an instructor";
    if (!form.date) e.date = "Date and time are required";
    if (!form.maxCapacity || parseInt(form.maxCapacity) < 1) e.maxCapacity = "Enter a valid capacity";
    setErrors(e); return Object.keys(e).length === 0;
  }

  const noClassTypes = classTypes.length === 0;
  const noInstructors = instructors.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#bb5309] hover:bg-[#9a4508] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule a Session</DialogTitle></DialogHeader>
        {(noClassTypes || noInstructors) ? (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {noClassTypes && "Create at least one Class Type first. "}
              {noInstructors && "Create at least one Instructor first."}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (validate()) mutation.mutate(form); }} className="space-y-4 mt-2">
            <div>
              <Label>Class Type <span className="text-red-500">*</span></Label>
              <Select value={form.classTypeId} onValueChange={v => setForm(f => ({ ...f, classTypeId: v }))}>
                <SelectTrigger className={errors.classTypeId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select class type..." />
                </SelectTrigger>
                <SelectContent>
                  {classTypes.map(ct => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.name} — Rs.{ct.price} / {ct.duration}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classTypeId && <p className="text-xs text-red-500 mt-1">{errors.classTypeId}</p>}
            </div>
            <div>
              <Label>Instructor <span className="text-red-500">*</span></Label>
              <Select value={form.instructorId} onValueChange={v => setForm(f => ({ ...f, instructorId: v }))}>
                <SelectTrigger className={errors.instructorId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select instructor..." />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map(ins => (
                    <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.instructorId && <p className="text-xs text-red-500 mt-1">{errors.instructorId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date and Time (IST) <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={errors.date ? "border-red-500" : ""} />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
              <div>
                <Label>Max Capacity <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" max="500" value={form.maxCapacity}
                  onChange={e => setForm(f => ({ ...f, maxCapacity: e.target.value }))}
                  className={errors.maxCapacity ? "border-red-500" : ""} />
                {errors.maxCapacity && <p className="text-xs text-red-500 mt-1">{errors.maxCapacity}</p>}
              </div>
            </div>
            <div>
              <Label>Google Meet Link <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input value={form.googleMeetLink} onChange={e => setForm(f => ({ ...f, googleMeetLink: e.target.value }))}
                placeholder="https://meet.google.com/..." />
            </div>
            <div>
              <Label>Razorpay Payment Link <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input value={form.razorpayLink} onChange={e => setForm(f => ({ ...f, razorpayLink: e.target.value }))}
                placeholder="https://rzp.io/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-[#bb5309] hover:bg-[#9a4508] text-white">
                {mutation.isPending ? "Creating..." : "Schedule Session"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
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
      queryKey: ["/api/instructors"],
      queryFn: async () => {
        const res = await fetch("/api/instructors");
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const { data: sessions = [], isLoading: sessLoading, refetch: refetchSess } =
    useQuery<ClassSession[]>({
      queryKey: ["/api/classes"],
      queryFn: async () => {
        const res = await fetch("/api/classes");
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
    });

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out" });
    setLocation("/admin/login");
  };

  const getCompletenessColor = (pct: number) =>
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: usersData?.totalUsers ?? 0, icon: Users, color: "text-[#3d1b80]" },
            { label: "Complete Profiles", value: usersData?.completeProfiles ?? 0, icon: UserCheck, color: "text-green-600" },
            { label: "Incomplete Profiles", value: usersData?.incompleteProfiles ?? 0, icon: UserX, color: "text-orange-500" },
            { label: "Sessions Scheduled", value: sessions.length, icon: Calendar, color: "text-[#bb5309]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6 bg-white border">
            <TabsTrigger value="users" className="data-[state=active]:bg-[#3d1b80] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="class-types" className="data-[state=active]:bg-[#3d1b80] data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" /> Class Types
            </TabsTrigger>
            <TabsTrigger value="instructors" className="data-[state=active]:bg-[#3d1b80] data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" /> Instructors
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-[#bb5309] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" /> Sessions
            </TabsTrigger>
          </TabsList>

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
                <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
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
                        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
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

          {/* CLASS TYPES */}
          <TabsContent value="class-types">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#3d1b80]" /> Class Types
                  </CardTitle>
                  <CardDescription>Yoga disciplines offered on the platform ({classTypes.length} total)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchCT()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <CreateClassTypeModal onCreated={() => refetchCT()} />
                </div>
              </CardHeader>
              <CardContent>
                {ctLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
                  </div>
                ) : (
                  <>
                    {classTypes.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No class types yet</p>
                        <p className="text-sm mt-1">Create your first class type to populate the and We Teach section</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classTypes.map(ct => (
                        <div key={ct.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            {ct.imageUrl && (
                              <img src={ct.imageUrl} alt={ct.name}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900">{ct.name}</h3>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ct.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[#3d1b80] border-[#3d1b80]">Rs.{ct.price}</Badge>
                                <Badge variant="outline" className="text-gray-600">{ct.duration} min</Badge>
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchIns()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <CreateInstructorModal onCreated={() => refetchIns()} />
                </div>
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
                              <h3 className="font-semibold text-gray-900">{ins.name}</h3>
                              {ins.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ins.bio}</p>}
                              {ins.specialties && ins.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {ins.specialties.map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              )}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#bb5309]" /> Sessions
                  </CardTitle>
                  <CardDescription>All scheduled sessions ({sessions.length} total)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchSess()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <CreateSessionModal classTypes={classTypes} instructors={instructors} onCreated={() => refetchSess()} />
                </div>
              </CardHeader>
              <CardContent>
                {sessLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bb5309]" />
                  </div>
                ) : (
                  <>
                    {sessions.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No sessions scheduled yet</p>
                        <p className="text-sm mt-1">
                          {classTypes.length === 0 || instructors.length === 0
                            ? "Create class types and instructors first, then schedule sessions."
                            : "Use New Session to schedule your first session."}
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {[...sessions]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(sess => {
                          const ct = classTypes.find(c => c.id === sess.classTypeId);
                          const ins = instructors.find(i => i.id === sess.instructorId);
                          const pct = sess.maxCapacity > 0
                            ? Math.round((sess.currentBookings / sess.maxCapacity) * 100) : 0;
                          const isFull = sess.currentBookings >= sess.maxCapacity;
                          const isPast = new Date(sess.date) < new Date();

                          return (
                            <div key={sess.id}
                              className={`border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow ${isPast ? "opacity-60" : ""}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-gray-900">{ct?.name ?? "Unknown class"}</h3>
                                    {isPast && <Badge variant="secondary" className="text-xs">Past</Badge>}
                                    {isFull && !isPast && <Badge className="bg-red-100 text-red-700 text-xs">Full</Badge>}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {ins?.name ?? "Unknown instructor"} · {formatDate(sess.date)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${isFull ? "bg-red-500" : "bg-[#3d1b80]"}`}
                                        style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {sess.currentBookings}/{sess.maxCapacity} booked
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {ct && <Badge variant="outline" className="text-[#3d1b80] border-[#3d1b80]">Rs.{ct.price}</Badge>}
                                  <div className="flex flex-col gap-1 mt-2">
                                    {sess.googleMeetLink ? (
                                      <a href={sess.googleMeetLink} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline">Meet Link</a>
                                    ) : (
                                      <span className="text-xs text-gray-400">No Meet link</span>
                                    )}
                                    {sess.razorpayLink ? (
                                      <a href={sess.razorpayLink} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-green-600 hover:underline">Payment Link</a>
                                    ) : (
                                      <span className="text-xs text-gray-400">No payment link</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
