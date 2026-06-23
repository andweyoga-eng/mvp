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
import Home from "@/pages/home";
import AccountApp from "@/pages/account";
import MyAccountRedirect from "@/pages/my-account";
import ResetPassword from "@/pages/reset-password";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import SessionFeedback from "@/pages/session-feedback";
import NotFound from "@/pages/not-found";
import { MemberPostAuthLanding } from "@/components/member-post-auth-landing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/account/profile" component={AccountApp} />
      <Route path="/account/health" component={AccountApp} />
      <Route path="/account/subscriptions" component={AccountApp} />
      <Route path="/account/payments" component={AccountApp} />
      <Route path="/account" component={AccountApp} />
      <Route path="/my-account" component={MyAccountRedirect} />
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
      <AuthProvider>
        <PaymentVerifiedProvider>
          <DeactivatedGate>
            <AdminAuthProvider>
              <TooltipProvider>
                <Toaster />
                <MemberPostAuthLanding />
                <Router />
              </TooltipProvider>
            </AdminAuthProvider>
          </DeactivatedGate>
        </PaymentVerifiedProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
