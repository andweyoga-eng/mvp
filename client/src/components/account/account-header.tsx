import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountNavMenu } from "@/components/account/account-nav-menu";
import { UnsavedChangesDialog } from "@/components/account/unsaved-changes-dialog";
import { useAccount } from "@/components/account/account-context";
import {
  ACCOUNT_SECTION_TITLES,
  type AccountSection,
} from "@/lib/account-routes";

export function AccountHeader({ section }: { section: AccountSection }) {
  const { navigateToSessions, hasUnsavedChangesForSection, resetProfileFormFromUser, section: currentSection } =
    useAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSubPage = section !== "sessions";
  const title = ACCOUNT_SECTION_TITLES[section];

  const goBackToSessions = () => {
    resetProfileFormFromUser();
    navigateToSessions();
  };

  const handleBack = () => {
    if (hasUnsavedChangesForSection(currentSection)) {
      setConfirmOpen(true);
      return;
    }
    goBackToSessions();
  };

  return (
    <>
      <header
        className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border/60 bg-gradient-to-br from-purple-50/95 via-white/95 to-orange-50/95 px-4 py-3 backdrop-blur-sm md:top-16"
        data-testid="account-page-header"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {isSubPage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-primary hover:text-secondary"
              onClick={handleBack}
              data-testid="account-back-button"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div className="w-[72px] shrink-0 md:hidden" aria-hidden="true" />
          )}

          <h1 className="flex-1 truncate text-center text-lg font-bold text-primary md:text-xl">
            {title}
          </h1>

          <div className="shrink-0">
            <AccountNavMenu />
          </div>
        </div>
      </header>

      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onLeave={() => {
          setConfirmOpen(false);
          goBackToSessions();
        }}
      />
    </>
  );
}
