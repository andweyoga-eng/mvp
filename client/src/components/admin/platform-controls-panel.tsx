import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertCircle, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  MAINTENANCE_WINDOW_SETTING_KEY,
  FEATURE_WEDIET_VISIBLE_KEY,
  FEATURE_WEDIET_INTERACTIVE_KEY,
  FEATURE_WEEMO_VISIBLE_KEY,
  FEATURE_WEEMO_INTERACTIVE_KEY,
  FEATURE_WEBUILD_VISIBLE_KEY,
  FEATURE_WEBUILD_INTERACTIVE_KEY,
  FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY,
  parseGuestCheckoutEnabled,
  parseMaintenanceWindowEnabled,
  parseFeatureGateEnabled,
  type FeatureGateSettingKey,
} from "@shared/platform-settings";
import { adminSectionTabTrigger } from "@/lib/admin-tab-styles";

interface PlatformSettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string | null;
}

const PROPAGATION_CAUTION =
  "Changes can take up to 90 seconds to apply everywhere (30s server cache + 60s client refresh). " +
  "Guests with an open tab may still see “Continue as Guest” briefly; the server rejects new guest bookings once OFF. " +
  "In-flight checkouts started before the flip will still complete.";

type ToggleDef = {
  key: string;
  label: string;
  descriptionOn: string;
  descriptionOff: string;
  parse: (v: unknown) => boolean;
  successOn: string;
  successOff: string;
  successDetailOn: string;
  successDetailOff: string;
  testId: string;
};

const USER_SETTING_TOGGLES: ToggleDef[] = [
  {
    key: GUEST_CHECKOUT_SETTING_KEY,
    label: "Guest Checkout",
    descriptionOn: "Guests can book drop-in and trial sessions without an account.",
    descriptionOff:
      "New guest bookings are blocked. Visitors must sign in to book. In-flight guest checkouts and historical guest bookings are unaffected.",
    parse: parseGuestCheckoutEnabled,
    successOn: "Guest checkout enabled",
    successOff: "Guest checkout disabled",
    successDetailOn: "Visitors can book drop-in and trial sessions without an account.",
    successDetailOff: "New guest bookings are blocked. Visitors must sign in to book.",
    testId: "guest-checkout-toggle",
  },
  {
    key: MAINTENANCE_WINDOW_SETTING_KEY,
    label: "Enable maintenance window",
    descriptionOn:
      "The public site shows a frosted overlay. The carousel stays visible but booking and navigation are blocked. Active members are notified on channels they opted into (email and WhatsApp).",
    descriptionOff: "Visitors can use the public site normally. Turn on before planned downtime.",
    parse: parseMaintenanceWindowEnabled,
    successOn: "Maintenance window enabled",
    successOff: "Maintenance window disabled",
    successDetailOn:
      "Visitors see a maintenance overlay. Active members are notified on their consented channels.",
    successDetailOff: "The public site is accessible again.",
    testId: "maintenance-window-toggle",
  },
];

const FEATURE_TOGGLES: ToggleDef[] = [
  {
    key: FEATURE_WEDIET_VISIBLE_KEY,
    label: "weDiet: show in launcher",
    descriptionOn: "weDiet tab is visible in the member hub launcher.",
    descriptionOff: "weDiet is hidden from the launcher. Entitled members (later) can still open it.",
    parse: parseFeatureGateEnabled,
    successOn: "weDiet visible",
    successOff: "weDiet hidden",
    successDetailOn: "Launcher shows weDiet.",
    successDetailOff: "Launcher hides weDiet and reflows.",
    testId: "feature-wediet-visible-toggle",
  },
  {
    key: FEATURE_WEDIET_INTERACTIVE_KEY,
    label: "weDiet: inputs & CTAs live",
    descriptionOn: "Members can use weDiet inputs and actions.",
    descriptionOff: "Page stays open; inputs and CTAs are frozen (platform-level).",
    parse: parseFeatureGateEnabled,
    successOn: "weDiet interactive",
    successOff: "weDiet frozen",
    successDetailOn: "weDiet CTAs are live.",
    successDetailOff: "weDiet CTAs are frozen; the page remains viewable.",
    testId: "feature-wediet-interactive-toggle",
  },
  {
    key: FEATURE_WEEMO_VISIBLE_KEY,
    label: "weEmo: show in launcher",
    descriptionOn: "weEmo tab is visible in the member hub launcher.",
    descriptionOff: "weEmo is hidden from the launcher.",
    parse: parseFeatureGateEnabled,
    successOn: "weEmo visible",
    successOff: "weEmo hidden",
    successDetailOn: "Launcher shows weEmo.",
    successDetailOff: "Launcher hides weEmo and reflows.",
    testId: "feature-weemo-visible-toggle",
  },
  {
    key: FEATURE_WEEMO_INTERACTIVE_KEY,
    label: "weEmo: inputs & CTAs live",
    descriptionOn: "Members can use weEmo inputs and actions.",
    descriptionOff: "Page stays open; inputs and CTAs are frozen (platform-level).",
    parse: parseFeatureGateEnabled,
    successOn: "weEmo interactive",
    successOff: "weEmo frozen",
    successDetailOn: "weEmo CTAs are live.",
    successDetailOff: "weEmo CTAs are frozen; the page remains viewable.",
    testId: "feature-weemo-interactive-toggle",
  },
  {
    key: FEATURE_WEBUILD_VISIBLE_KEY,
    label: "weBuild: show in launcher",
    descriptionOn: "weBuild tab is visible in the member hub launcher.",
    descriptionOff: "weBuild is hidden from the launcher.",
    parse: parseFeatureGateEnabled,
    successOn: "weBuild visible",
    successOff: "weBuild hidden",
    successDetailOn: "Launcher shows weBuild.",
    successDetailOff: "Launcher hides weBuild and reflows.",
    testId: "feature-webuild-visible-toggle",
  },
  {
    key: FEATURE_WEBUILD_INTERACTIVE_KEY,
    label: "weBuild: inputs & CTAs live",
    descriptionOn: "Members can use weBuild inputs and actions.",
    descriptionOff: "Page stays open; inputs and CTAs are frozen (platform-level).",
    parse: parseFeatureGateEnabled,
    successOn: "weBuild interactive",
    successOff: "weBuild frozen",
    successDetailOn: "weBuild CTAs are live.",
    successDetailOff: "weBuild CTAs are frozen; the page remains viewable.",
    testId: "feature-webuild-interactive-toggle",
  },
  {
    key: FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY,
    label: "andWeYOGa always available",
    descriptionOn:
      "Sessions stay available for all members. Program create greys the andWeYOGa checkbox (always implied).",
    descriptionOff:
      "Policy escape hatch for future gating of andWeYOGa. Program checkbox can become editable later.",
    parse: parseFeatureGateEnabled,
    successOn: "andWeYOGa always available",
    successOff: "andWeYOGa always-available policy off",
    successDetailOn: "Sessions remain ungated; program checkbox stays greyed.",
    successDetailOff: "Future andWeYOGa gating is allowed by policy (member gate not enforced yet).",
    testId: "feature-andweyoga-always-available-toggle",
  },
];

export function PlatformControlsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("user-settings");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const { data: settings = [], isLoading, isError } = useQuery<PlatformSettingRow[]>({
    queryKey: ["/api/admin/platform-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-settings", {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  function rowEnabled(def: ToggleDef): boolean {
    const row = settings.find((r) => r.key === def.key);
    return row ? def.parse(row.value) : def.parse(undefined);
  }

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      setPendingKey(key);
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json() as Promise<{ key: string; enabled?: boolean }>;
    },
    onMutate: async ({ key, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/platform-settings"] });
      const previous = queryClient.getQueryData<PlatformSettingRow[]>(["/api/admin/platform-settings"]);
      queryClient.setQueryData<PlatformSettingRow[]>(
        ["/api/admin/platform-settings"],
        (old = []) => {
          const rest = old.filter((row) => row.key !== key);
          return [
            ...rest,
            {
              key,
              value: enabled,
              updatedAt: new Date().toISOString(),
              updatedBy: null,
            },
          ];
        },
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/admin/platform-settings"], context.previous);
      }
      toast({
        title: "Could not update setting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/config"] });
      const def = [...USER_SETTING_TOGGLES, ...FEATURE_TOGGLES].find((t) => t.key === vars.key);
      if (def) {
        toast({
          title: vars.enabled ? def.successOn : def.successOff,
          description: vars.enabled ? def.successDetailOn : def.successDetailOff,
        });
      }
    },
    onSettled: () => setPendingKey(null),
  });

  function renderToggle(def: ToggleDef) {
    const enabled = rowEnabled(def);
    return (
      <div
        key={def.key}
        className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4"
      >
        <div className="space-y-1.5 flex-1">
          <Label htmlFor={def.testId} className="text-base font-semibold text-gray-900">
            {def.label}
          </Label>
          <p className="text-sm text-muted-foreground">
            {enabled ? def.descriptionOn : def.descriptionOff}
          </p>
        </div>
        <Switch
          id={def.testId}
          checked={enabled}
          disabled={toggleMutation.isPending && pendingKey === def.key}
          onCheckedChange={(checked) => toggleMutation.mutate({ key: def.key, enabled: checked })}
          data-testid={def.testId}
        />
      </div>
    );
  }

  return (
    <Tabs value={section} onValueChange={setSection}>
      <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 bg-white border p-1">
        <TabsTrigger value="user-settings" className={adminSectionTabTrigger}>
          User Settings
        </TabsTrigger>
        <TabsTrigger value="feature-gates" className={adminSectionTabTrigger}>
          Feature tabs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="user-settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#3d1b80]" />
              User Settings
            </CardTitle>
            <CardDescription>
              Platform-wide controls for member and visitor booking behaviour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading platform settings…</p>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load platform settings. Please refresh.</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription className="text-amber-950 text-sm">{PROPAGATION_CAUTION}</AlertDescription>
                </Alert>
                {USER_SETTING_TOGGLES.map(renderToggle)}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="feature-gates">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#3d1b80]" />
              Feature tabs
            </CardTitle>
            <CardDescription>
              Hide/unhide launcher tabs and freeze CTAs independently (SPEC-PLATFORM-FEATURE-GATES-01).
              Values are exclusive atomic booleans. Program entitlements are store-only until a later
              release.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading platform settings…</p>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load platform settings. Please refresh.</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription className="text-amber-950 text-sm">
                    Visible and Interactive are independent. Hiding a tab reflows the launcher; one tab
                    left collapses the strip. Freezing keeps the page open with inputs disabled.
                  </AlertDescription>
                </Alert>
                {FEATURE_TOGGLES.map(renderToggle)}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

/** Exported for tests — feature gate keys that must stay on the allowlist. */
export const PLATFORM_FEATURE_GATE_KEYS_FOR_TESTS: FeatureGateSettingKey[] = [
  FEATURE_WEDIET_VISIBLE_KEY,
  FEATURE_WEDIET_INTERACTIVE_KEY,
  FEATURE_WEEMO_VISIBLE_KEY,
  FEATURE_WEEMO_INTERACTIVE_KEY,
  FEATURE_WEBUILD_VISIBLE_KEY,
  FEATURE_WEBUILD_INTERACTIVE_KEY,
  FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY,
];
