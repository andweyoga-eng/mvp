import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, MessageSquare } from "lucide-react";
import { AdminCalorieStatementView } from "@/components/admin/calorie-statement-view";

type ProgressUser = {
  userId: string;
  name: string;
  email: string;
  subscriptionId: string;
  horizonStartAt: string | null;
  horizonEndAt: string | null;
};

type ProgressProgram = {
  id: string;
  title: string;
  classTypeName: string | null;
  kind: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  totalSessions: number;
  version: number;
  status: string;
  activeEnrollmentCount: number;
  users: ProgressUser[];
};

type HealthPage = {
  userId: string;
  name: string;
  email: string;
  page: number;
  totalPages: number;
  entry: {
    kind: "current" | "archive";
    text: string;
    savedAt: string | null;
    documentUrls: string[];
    mediaLinks: unknown;
  };
};

type ProgressComment = {
  id: string;
  body: string;
  authorAdminId: string;
  authorName?: string;
  authorRole?: string;
  createdAt: string;
  editedAt: string | null;
  instructorAckRequired: boolean;
  acknowledgedAt: string | null;
};

type SectionKey = "health_history" | "calorie_statement";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function SectionComments({
  userId,
  section,
}: {
  userId: string;
  section: SectionKey;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [ackRequired, setAckRequired] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const commentsQuery = useQuery({
    queryKey: ["admin", "progress", "comments", userId, section],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/progress/users/${userId}/sections/${section}/comments`,
        { credentials: "include", headers: adminHeaders() },
      );
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json() as Promise<{ comments: ProgressComment[] }>;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin", "progress", "comments", userId, section],
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/progress/users/${userId}/sections/${section}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: adminHeaders(),
          body: JSON.stringify({
            body: draft,
            instructorAckRequired: section === "health_history" ? ackRequired : false,
          }),
        },
      );
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      setAckRequired(false);
      invalidate();
      toast({ title: "Comment added" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const res = await fetch(`/api/admin/progress/comments/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditDraft("");
      invalidate();
      toast({ title: "Comment updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/progress/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Comment removed" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-4 rounded-md border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Section notes (audit trail)
      </div>
      <p className="text-xs text-muted-foreground">
        Comments apply to this whole section, not individual updates, meals, or weeks.
        Instructor acknowledgement is reserved for a future session-join gate.
      </p>

      {commentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : (commentsQuery.data?.comments ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {(commentsQuery.data?.comments ?? []).map((c) => (
            <li key={c.id} className="rounded border bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">
                  {c.authorName ?? "Admin"}
                </span>
                {c.authorRole ? <Badge variant="outline">{c.authorRole}</Badge> : null}
                <span>{formatWhen(c.createdAt)}</span>
                {c.editedAt ? <span>(edited {formatWhen(c.editedAt)})</span> : null}
                {c.instructorAckRequired ? (
                  <Badge variant="outline" className="border-amber-600 text-amber-800">
                    {c.acknowledgedAt ? "Instructor acked" : "Ack required (future)"}
                  </Badge>
                ) : null}
              </div>
              {editingId === c.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={editMutation.isPending || !editDraft.trim()}
                      onClick={() => editMutation.mutate({ id: c.id, body: editDraft })}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditDraft(c.body);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("Soft-delete this comment? It stays in the audit trail.")) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 pt-1">
        <Textarea
          placeholder="Add a coaching note for this section…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
        />
        {section === "health_history" ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`ack-${userId}-${section}`}
              checked={ackRequired}
              onCheckedChange={(v) => setAckRequired(v === true)}
            />
            <Label htmlFor={`ack-${userId}-${section}`} className="text-xs font-normal">
              Flag for future instructor acknowledgement before session join
            </Label>
          </div>
        ) : null}
        <Button
          size="sm"
          disabled={createMutation.isPending || !draft.trim()}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving
            </>
          ) : (
            "Add note"
          )}
        </Button>
      </div>
    </div>
  );
}

function HealthSection({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "progress", "health", userId, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/progress/users/${userId}/health?page=${page}`,
        { credentials: "include", headers: adminHeaders() },
      );
      if (!res.ok) throw new Error("Failed to load health");
      return res.json() as Promise<HealthPage>;
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground py-2">Loading health…</p>;
  }
  if (query.error || !query.data) {
    return <p className="text-sm text-destructive py-2">Could not load health updates.</p>;
  }

  const { entry, totalPages } = query.data;
  const mediaLinks = Array.isArray(entry.mediaLinks) ? entry.mediaLinks : [];

  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {entry.kind === "current" ? "Current" : "Archive"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Saved {formatWhen(entry.savedAt)} · page {query.data.page} of {totalPages}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded border bg-white p-3 whitespace-pre-wrap text-sm min-h-[6rem]">
        {entry.text?.trim() ? entry.text : (
          <span className="text-muted-foreground">No health text on this page.</span>
        )}
      </div>
      {entry.documentUrls?.length ? (
        <div className="text-xs space-y-1">
          <p className="font-medium">Document URLs</p>
          <ul className="list-disc pl-4">
            {entry.documentUrls.map((u) => (
              <li key={u} className="break-all">
                <a href={u} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {mediaLinks.length ? (
        <div className="text-xs space-y-1">
          <p className="font-medium">Media links</p>
          <ul className="list-disc pl-4">
            {mediaLinks.map((link, i) => {
              const url =
                link && typeof link === "object" && "url" in link
                  ? String((link as { url: string }).url)
                  : String(link);
              return (
                <li key={`${url}-${i}`} className="break-all">
                  <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                    {url}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <SectionComments userId={userId} section="health_history" />
    </div>
  );
}

function UserSections({ user }: { user: ProgressUser }) {
  return (
    <Accordion type="multiple" className="pl-2">
      <AccordionItem value="health">
        <AccordionTrigger className="text-sm py-3">
          Health updates &amp; History
        </AccordionTrigger>
        <AccordionContent>
          <HealthSection userId={user.userId} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="calorie">
        <AccordionTrigger className="text-sm py-3">Calorie statement</AccordionTrigger>
        <AccordionContent>
          <AdminCalorieStatementView
            userId={user.userId}
            footer={<SectionComments userId={user.userId} section="calorie_statement" />}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function AndWeProgressPanel() {
  const query = useQuery({
    queryKey: ["admin", "progress", "programs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/progress/programs", {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load programs");
      return res.json() as Promise<{ programs: ProgressProgram[] }>;
    },
  });

  const programs = useMemo(() => query.data?.programs ?? [], [query.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>andWeProgress</CardTitle>
        <CardDescription>
          Active program enrollments → members → health history and calorie statements.
          Section notes are threaded for audit; instructor acknowledgement is a future hook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading programs…</p>
        ) : query.error ? (
          <p className="text-sm text-destructive">Could not load andWeProgress.</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active program enrollments yet.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full" defaultValue={["programs-root"]}>
            <AccordionItem value="programs-root">
              <AccordionTrigger className="text-base font-semibold">
                Programs ({programs.length})
              </AccordionTrigger>
              <AccordionContent>
                <Accordion type="multiple" className="w-full">
                  {programs.map((p) => (
                    <AccordionItem key={p.id} value={p.id}>
                      <AccordionTrigger className="text-sm">
                        <span className="text-left">
                          {p.title}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {p.activeEnrollmentCount} active
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {p.users.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No users</p>
                        ) : (
                          <Accordion type="multiple" className="pl-1">
                            {p.users.map((u) => (
                              <AccordionItem key={`${p.id}-${u.userId}`} value={u.userId}>
                                <AccordionTrigger className="text-sm py-3">
                                  <span className="text-left">
                                    {u.name}
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                      {u.email}
                                    </span>
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <UserSections user={u} />
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
