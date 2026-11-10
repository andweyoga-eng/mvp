import type { Express } from "express";
import { z } from "zod";
import {
  PROGRESS_SECTION_TYPES,
  type ProgressSectionType,
} from "@shared/schema";
import { parseHealthHistory } from "@shared/health-disclosure";
import {
  DEFAULT_FUEL_MEAL_PLAN,
  dayStatus,
  formatSignedDelta,
  shouldShowDayVerdict,
  signedDelta,
  averageDailyTotalsVsTarget,
  type FuelMealPlan,
} from "@shared/fuel";
import { storage } from "./storage";
import type { AdminAuthRequest } from "./adminAuth";
import { requireAdminAuth } from "./adminAuth";

const sectionParamSchema = z.enum(PROGRESS_SECTION_TYPES);
const commentBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  instructorAckRequired: z.boolean().optional(),
});
const editCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

function weekDateKeys(anchorDate: string): string[] {
  const [y, m, d] = anchorDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = anchor.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

function shiftWeekStart(weekStart: string, deltaWeeks: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaWeeks * 7);
  return dt.toISOString().slice(0, 10);
}

function publicMeal(row: Awaited<ReturnType<typeof storage.listFuelMealsForUser>>[number]) {
  return {
    id: row.id,
    loggedDate: row.loggedDate,
    loggedAt: row.loggedAt,
    name: row.name,
    calories: row.calories,
    targetAtLogCal: row.targetAtLogCal,
    mealSlotIndex: row.mealSlotIndex,
    clientLocalTime: row.clientLocalTime,
  };
}

function serializeComment(
  c: Awaited<ReturnType<typeof storage.listProgressSectionComments>>[number] | Awaited<
    ReturnType<typeof storage.createProgressSectionComment>
  > & { authorName?: string; authorRole?: string },
) {
  return {
    id: c.id,
    userId: c.userId,
    section: c.section,
    body: c.body,
    authorAdminId: c.authorAdminId,
    authorName: "authorName" in c ? c.authorName : undefined,
    authorRole: "authorRole" in c ? c.authorRole : undefined,
    createdAt: c.createdAt,
    editedAt: c.editedAt,
    editedByAdminId: c.editedByAdminId,
    instructorAckRequired: c.instructorAckRequired,
    acknowledgedAt: c.acknowledgedAt,
    acknowledgedByInstructorId: c.acknowledgedByInstructorId,
  };
}

export function registerProgressRoutes(app: Express) {
  app.get("/api/admin/progress/programs", requireAdminAuth, async (_req, res) => {
    try {
      const programs = await storage.getProgressProgramsTree();
      res.json({
        programs: programs.map((p) => ({
          ...p,
          title: `${p.classTypeName ?? "Program"} · ${p.kind} · ${p.sessionsPerWeek}/wk × ${p.durationWeeks}w (v${p.version})`,
        })),
      });
    } catch (error) {
      console.error("[progress] programs tree error:", error);
      res.status(500).json({ message: "Failed to load andWeProgress programs" });
    }
  });

  app.get(
    "/api/admin/progress/users/:userId/health",
    requireAdminAuth,
    async (req, res) => {
      try {
        const user = await storage.getUser(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const history = parseHealthHistory(user.healthUpdateHistory).slice(0, 5);
        const entries: Array<{
          kind: "current" | "archive";
          text: string;
          savedAt: string | null;
          documentUrls: string[];
          mediaLinks: unknown;
        }> = [
          {
            kind: "current",
            text: user.healthUpdateText ?? "",
            savedAt: user.healthUpdateLastModified
              ? new Date(user.healthUpdateLastModified).toISOString()
              : null,
            documentUrls: user.healthDocumentUrls ?? [],
            mediaLinks: user.healthMediaLinks ?? [],
          },
          ...history.map((h) => ({
            kind: "archive" as const,
            text: h.text,
            savedAt: h.savedAt,
            documentUrls: h.documentUrls ?? [],
            mediaLinks: h.mediaLinks ?? [],
          })),
        ];

        const totalPages = Math.max(1, entries.length);
        const pageRaw = Number(req.query.page ?? 1);
        const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
        const clamped = Math.min(page, totalPages);
        const entry = entries[clamped - 1];

        res.json({
          userId: user.id,
          name: user.name,
          email: user.email,
          page: clamped,
          totalPages,
          entry,
        });
      } catch (error) {
        console.error("[progress] health error:", error);
        res.status(500).json({ message: "Failed to load health progress" });
      }
    },
  );

  app.get(
    "/api/admin/progress/users/:userId/fuel/statement",
    requireAdminAuth,
    async (req, res) => {
      try {
        const user = await storage.getUser(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const target = user.dailyCalorieTargetCal;
        const deficit = user.dailyDeficitCal;
        if (target == null || deficit == null) {
          return res.status(400).json({
            code: "fuel_not_configured",
            message: "Fuel is not configured for this member yet.",
          });
        }

        const weekStartParam =
          typeof req.query.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.weekStart)
            ? req.query.weekStart
            : null;
        const anchor = weekStartParam ?? new Date().toISOString().slice(0, 10);
        const weekKeys = weekDateKeys(anchor);
        const weekStart = weekKeys[0];
        const weekEnd = weekKeys[6];
        const today = new Date().toISOString().slice(0, 10);

        const meals = await storage.listFuelMealsForUser(user.id, {
          fromDate: weekStart,
          toDate: weekEnd,
          limit: 500,
        });

        const plan = (user.fuelMealPlan as FuelMealPlan | null) ?? DEFAULT_FUEL_MEAL_PLAN;
        const byDate = new Map<string, number>();
        for (const m of meals) {
          byDate.set(m.loggedDate, (byDate.get(m.loggedDate) ?? 0) + m.calories);
        }
        const daysWithMeals = weekKeys.filter((d) => (byDate.get(d) ?? 0) > 0);
        const avgDelta = averageDailyTotalsVsTarget(
          daysWithMeals.map((d) => byDate.get(d) ?? 0),
          target,
        );

        const rows = meals.map((m) => {
          const dayTotal = byDate.get(m.loggedDate) ?? m.calories;
          const ready =
            m.loggedDate < today ||
            shouldShowDayVerdict({
              plan,
              loggedSlotIndexes: meals
                .filter((x) => x.loggedDate === m.loggedDate)
                .map((x) => x.mealSlotIndex),
            });
          return {
            ...publicMeal(m),
            dayTotal,
            dayStatus: ready ? dayStatus(dayTotal, m.targetAtLogCal || target, deficit) : "pending",
            dayDelta: ready
              ? formatSignedDelta(signedDelta(dayTotal, m.targetAtLogCal || target))
              : null,
          };
        });

        res.json({
          userId: user.id,
          name: user.name,
          email: user.email,
          weekStart,
          weekEnd,
          prevWeekStart: shiftWeekStart(weekStart, -1),
          nextWeekStart: shiftWeekStart(weekStart, 1),
          today,
          target,
          deficit,
          mealsLoggedThisWeek: meals.length,
          avgDailyDelta: avgDelta,
          rows,
        });
      } catch (error) {
        console.error("[progress] fuel statement error:", error);
        res.status(500).json({ message: "Failed to load calorie statement" });
      }
    },
  );

  app.get(
    "/api/admin/progress/users/:userId/sections/:section/comments",
    requireAdminAuth,
    async (req, res) => {
      try {
        const sectionParse = sectionParamSchema.safeParse(req.params.section);
        if (!sectionParse.success) {
          return res.status(400).json({ message: "Invalid section" });
        }
        const user = await storage.getUser(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const comments = await storage.listProgressSectionComments(
          user.id,
          sectionParse.data,
        );
        res.json({
          userId: user.id,
          section: sectionParse.data as ProgressSectionType,
          comments: comments.map(serializeComment),
        });
      } catch (error) {
        console.error("[progress] list comments error:", error);
        res.status(500).json({ message: "Failed to load comments" });
      }
    },
  );

  app.post(
    "/api/admin/progress/users/:userId/sections/:section/comments",
    requireAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const sectionParse = sectionParamSchema.safeParse(req.params.section);
        if (!sectionParse.success) {
          return res.status(400).json({ message: "Invalid section" });
        }
        const bodyParse = commentBodySchema.safeParse(req.body);
        if (!bodyParse.success) {
          return res.status(400).json({ message: "Invalid comment", errors: bodyParse.error.issues });
        }
        const user = await storage.getUser(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!req.admin) return res.status(401).json({ message: "Admin required" });

        const created = await storage.createProgressSectionComment({
          userId: user.id,
          section: sectionParse.data,
          body: bodyParse.data.body,
          authorAdminId: req.admin.id,
          instructorAckRequired: bodyParse.data.instructorAckRequired,
        });

        res.status(201).json({
          comment: serializeComment({
            ...created,
            authorName: req.admin.name,
            authorRole: req.admin.role,
          }),
        });
      } catch (error) {
        console.error("[progress] create comment error:", error);
        res.status(500).json({ message: "Failed to create comment" });
      }
    },
  );

  app.patch(
    "/api/admin/progress/comments/:id",
    requireAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        const bodyParse = editCommentSchema.safeParse(req.body);
        if (!bodyParse.success) {
          return res.status(400).json({ message: "Invalid comment", errors: bodyParse.error.issues });
        }
        if (!req.admin) return res.status(401).json({ message: "Admin required" });

        const existing = await storage.getProgressSectionComment(req.params.id);
        if (!existing || existing.deletedAt) {
          return res.status(404).json({ message: "Comment not found" });
        }

        const updated = await storage.softEditProgressSectionComment({
          id: existing.id,
          body: bodyParse.data.body,
          editedByAdminId: req.admin.id,
        });
        if (!updated) return res.status(404).json({ message: "Comment not found" });

        res.json({ comment: serializeComment(updated) });
      } catch (error) {
        console.error("[progress] edit comment error:", error);
        res.status(500).json({ message: "Failed to edit comment" });
      }
    },
  );

  app.delete(
    "/api/admin/progress/comments/:id",
    requireAdminAuth,
    async (req: AdminAuthRequest, res) => {
      try {
        if (!req.admin) return res.status(401).json({ message: "Admin required" });

        const existing = await storage.getProgressSectionComment(req.params.id);
        if (!existing || existing.deletedAt) {
          return res.status(404).json({ message: "Comment not found" });
        }

        const deleted = await storage.softDeleteProgressSectionComment({
          id: existing.id,
          deletedByAdminId: req.admin.id,
        });
        if (!deleted) return res.status(404).json({ message: "Comment not found" });

        res.json({ ok: true });
      } catch (error) {
        console.error("[progress] delete comment error:", error);
        res.status(500).json({ message: "Failed to delete comment" });
      }
    },
  );
}
