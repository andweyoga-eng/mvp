import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { PaymentVerifiedProvider } from "@/components/payment-verified-provider";
import { DeactivatedAccountDialog } from "@/components/deactivated-account-dialog";
import { useState, useEffect, type ReactNode } from "react";
import { AdminAuthProvider } from "@/components/admin-auth-provider";
import { useLocation } from "wouter";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import Workshops from "@/pages/workshops";
import Trips from "@/pages/trips";
import Explore from "@/pages/explore";
import Emojou from "@/pages/emojou";
import FuelPage from "@/pages/fuel";
import Reserve from "@/pages/reserve";
import MyAccount from "@/pages/my-account";
import PrivacyNotice from "@/pages/privacy-notice";
import TermsOfService from "@/pages/terms-of-service";
import CancellationRefundPolicy from "@/pages/cancellation-refund-policy";
import Grievance from "@/pages/grievance";
import { mapLegacyAccountUrl } from "@/lib/account-routes";
import ResetPassword from "@/pages/reset-password";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import SessionFeedback from "@/pages/session-feedback";
import NotFound from "@/pages/not-found";
import { MemberPostAuthLanding } from "@/components/member-post-auth-landing";
import { PostAuthConsentGate } from "@/components/post-auth-consent-gate";
import { MaintenanceWindowOverlay } from "@/components/maintenance-window-overlay";

/** Legacy `/account/*` URLs now resolve to the single `/my-account` page anchor. */
function LegacyAccountRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(
      mapLegacyAccountUrl(window.location.pathname, window.location.search),
      { replace: true },
    );
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/workshops" component={Workshops} />
      <Route path="/trips" component={Trips} />
      <Route path="/explore" component={Explore} />
      <Route path="/emojou" component={Emojou} />
      <Route path="/fuel" component={FuelPage} />
      <Route path="/reserve" component={Reserve} />
      <Route path="/my-account" component={MyAccount} />
      <Route path="/privacy" component={PrivacyNotice} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/cancellation-refund" component={CancellationRefundPolicy} />
      <Route path="/grievance" component={Grievance} />
      <Route path="/account/profile" component={LegacyAccountRedirect} />
      <Route path="/account/health" component={LegacyAccountRedirect} />
      <Route path="/account/subscriptions" component={LegacyAccountRedirect} />
      <Route path="/account/payments" component={LegacyAccountRedirect} />
      <Route path="/account" component={LegacyAccountRedirect} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/session-feedback" component={SessionFeedback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DeactivatedGate({ children }: { children: ReactNode }) {
  const [showDeactivated, setShowDeactivated] = useState(false);

  useEffect(() => {
    const onDeactivated = () => setShowDeactivated(true);
    window.addEventListener("awy:account-deactivated", onDeactivated);
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "account_deactivated") {
      setShowDeactivated(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return () => window.removeEventListener("awy:account-deactivated", onDeactivated);
  }, []);

  return (
    <>
      {children}
      <DeactivatedAccountDialog open={showDeactivated} onOpenChange={setShowDeactivated} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PaymentVerifiedProvider>
            <DeactivatedGate>
              <AdminAuthProvider>
                <Toaster />
                <PostAuthConsentGate>
                  <MemberPostAuthLanding />
                  <MaintenanceWindowOverlay />
                  <Router />
                </PostAuthConsentGate>
              </AdminAuthProvider>
            </DeactivatedGate>
          </PaymentVerifiedProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
