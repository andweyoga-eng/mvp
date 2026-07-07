import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { GUEST_CHECKOUT_SETTING_KEY, MAINTENANCE_WINDOW_SETTING_KEY, parseGuestCheckoutEnabled, parseMaintenanceWindowEnabled } from "@shared/platform-settings";
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

export function PlatformControlsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("user-settings");

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

  const guestRow = settings.find((row) => row.key === GUEST_CHECKOUT_SETTING_KEY);
  const guestEnabled = guestRow ? parseGuestCheckoutEnabled(guestRow.value) : false;
  const maintenanceRow = settings.find((row) => row.key === MAINTENANCE_WINDOW_SETTING_KEY);
  const maintenanceEnabled = maintenanceRow ? parseMaintenanceWindowEnabled(maintenanceRow.value) : false;

  async function patchPlatformSetting(key: string, enabled: boolean) {
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
    return res.json() as Promise<Record<string, unknown>>;
  }

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await patchPlatformSetting(GUEST_CHECKOUT_SETTING_KEY, enabled);
      return { guestCheckoutEnabled: result.guestCheckoutEnabled === true } as {
        guestCheckoutEnabled: boolean;
      };
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/platform-settings"] });
      const previous = queryClient.getQueryData<PlatformSettingRow[]>(["/api/admin/platform-settings"]);
      queryClient.setQueryData<PlatformSettingRow[]>(
        ["/api/admin/platform-settings"],
        (old = []) => {
          const rest = old.filter((row) => row.key !== GUEST_CHECKOUT_SETTING_KEY);
          return [
            ...rest,
            {
              key: GUEST_CHECKOUT_SETTING_KEY,
              value: enabled,
              updatedAt: new Date().toISOString(),
              updatedBy: null,
            },
          ];
        },
      );
      return { previous };
    },
    onError: (error, _enabled, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/admin/platform-settings"], context.previous);
      }
      toast({
        title: "Could not update setting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/config"] });
      toast({
        title: result.guestCheckoutEnabled ? "Guest checkout enabled" : "Guest checkout disabled",
        description: result.guestCheckoutEnabled
          ? "Visitors can book drop-in and trial sessions without an account."
          : "New guest bookings are blocked. Visitors must sign in to book.",
      });
    },
  });

  const maintenanceToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await patchPlatformSetting(MAINTENANCE_WINDOW_SETTING_KEY, enabled);
      return { maintenanceWindowEnabled: result.maintenanceWindowEnabled === true } as {
        maintenanceWindowEnabled: boolean;
      };
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/platform-settings"] });
      const previous = queryClient.getQueryData<PlatformSettingRow[]>(["/api/admin/platform-settings"]);
      queryClient.setQueryData<PlatformSettingRow[]>(
        ["/api/admin/platform-settings"],
        (old = []) => {
          const rest = old.filter((row) => row.key !== MAINTENANCE_WINDOW_SETTING_KEY);
          return [
            ...rest,
            {
              key: MAINTENANCE_WINDOW_SETTING_KEY,
              value: enabled,
              updatedAt: new Date().toISOString(),
              updatedBy: null,
            },
          ];
        },
      );
      return { previous };
    },
    onError: (error, _enabled, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/admin/platform-settings"], context.previous);
      }
      toast({
        title: "Could not update setting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/config"] });
      toast({
        title: result.maintenanceWindowEnabled
          ? "Maintenance window enabled"
          : "Maintenance window disabled",
        description: result.maintenanceWindowEnabled
          ? "Visitors see a maintenance overlay. Active members are notified on their consented channels."
          : "The public site is accessible again.",
      });
    },
  });

  return (
    <Tabs value={section} onValueChange={setSection}>
      <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 bg-white border p-1">
        <TabsTrigger value="user-settings" className={adminSectionTabTrigger}>
          User Settings
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

                <div className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4">
                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="guest-checkout-toggle" className="text-base font-semibold text-gray-900">
                      Guest Checkout
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {guestEnabled
                        ? "Guests can book drop-in and trial sessions without an account."
                        : "New guest bookings are blocked. Visitors must sign in to book. In-flight guest checkouts and historical guest bookings are unaffected."}
                    </p>
                  </div>
                  <Switch
                    id="guest-checkout-toggle"
                    checked={guestEnabled}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                    data-testid="guest-checkout-toggle"
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4">
                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="maintenance-window-toggle" className="text-base font-semibold text-gray-900">
                      Enable maintenance window
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {maintenanceEnabled
                        ? "The public site shows a frosted overlay — the carousel stays visible but booking and navigation are blocked. Active members are notified on channels they opted into (email and WhatsApp)."
                        : "Visitors can use the public site normally. Turn on before planned downtime."}
                    </p>
                  </div>
                  <Switch
                    id="maintenance-window-toggle"
                    checked={maintenanceEnabled}
                    disabled={maintenanceToggleMutation.isPending}
                    onCheckedChange={(checked) => maintenanceToggleMutation.mutate(checked)}
                    data-testid="maintenance-window-toggle"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
