import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentHistory } from "@/components/payment-history";
import { HealthUpdateSection } from "@/components/health-update-section";
import { AccountStickyActions } from "@/components/account/account-sticky-actions";
import { useAccount } from "@/components/account/account-context";

export function AccountHealthPage() {
  const {
    confirmedHealth,
    healthDropdownValue,
    isConcernsPanelOpen,
    isLoading,
    handleOpenConcernsPanel,
    handleConfirmNoConcerns,
    handleConfirmConcerns,
    handlePanelCancel,
    handleHealthSaveAndSubmit,
    handleHealthCancel,
    setIsConcernsPanelOpen,
  } = useAccount();

  return (
    <div data-testid="health-content">
      <HealthUpdateSection
        confirmedHealth={confirmedHealth}
        dropdownValue={healthDropdownValue}
        isConcernsPanelOpen={isConcernsPanelOpen}
        onDropdownChange={handleOpenConcernsPanel}
        onConfirmNoConcerns={handleConfirmNoConcerns}
        onConfirmConcerns={handleConfirmConcerns}
        onPanelCancel={handlePanelCancel}
        onPanelOpenChange={setIsConcernsPanelOpen}
        onSaveAndSubmit={handleHealthSaveAndSubmit}
        onCancel={handleHealthCancel}
        isLoading={isLoading}
        hidePageActions
      />

      <AccountStickyActions>
        <Button
          onClick={handleHealthSaveAndSubmit}
          disabled={isLoading}
          className="h-12 w-full rounded-full bg-primary font-bold !text-white hover:bg-primary/90"
          data-testid="health-save-and-submit"
        >
          {isLoading ? "Saving..." : "Save and Submit"}
        </Button>
        <Button
          variant="outline"
          onClick={handleHealthCancel}
          disabled={isLoading}
          className="h-12 w-full rounded-full border-purple-200 font-bold text-purple-800 hover:bg-purple-50"
          data-testid="health-cancel"
        >
          Cancel
        </Button>
      </AccountStickyActions>
    </div>
  );
}

export function AccountSubscriptionsPage() {
  const { subscriptions } = useAccount();

  const scrollToSchedule = () => {
    window.location.href = "/?openBooking=true";
  };

  return (
    <div data-testid="subscriptions-content">
      <Card className="border-0 shadow-md md:border md:shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary">My Subscriptions</CardTitle>
          <CardDescription>
            Track usage across drop-in, trial, and recurring subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.map((s) => (
            <div key={s.id} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-primary">{s.classTypeName}</p>
                <Badge className="capitalize">{s.subscriptionType.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Used {s.utilizedSessions}/{s.totalSessions} · Refunded {s.refundedSessions} ·
                Disputes {s.disputedSessions}/{s.disputesResolved} · Waived {s.waivedSessions}
              </p>
              <p className="text-sm">Paid: ₹{(s.totalAmountPaise / 100).toLocaleString("en-IN")}</p>
              {s.subscriptionType === "recurring" &&
                (s.status !== "active" ||
                  (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now())) && (
                  <Button className="mt-2" onClick={scrollToSchedule}>
                    Renew
                  </Button>
                )}
            </div>
          ))}
          {subscriptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountPaymentsPage() {
  return (
    <div data-testid="payments-content">
      <PaymentHistory />
    </div>
  );
}
