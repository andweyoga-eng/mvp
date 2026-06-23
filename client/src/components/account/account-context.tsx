import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth, getAuthHeaders, type User } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatMobileNumber } from "@/lib/mobile-validation";
import { validateRequiredMobile } from "@/lib/account-profile-validation";
import {
  ACCOUNT_ROUTES,
  type AccountSection,
  getAccountSectionFromPath,
} from "@/lib/account-routes";
import {
  HEALTH_NO_CONCERNS_TEXT,
  type ConfirmedHealthState,
  type HealthDisclosureChoice,
  confirmedHealthFromSavedText,
  confirmedHealthToUpdateText,
  validateHealthDisclosureDraft,
} from "@shared/health-disclosure";
import {
  isAccountProfileComplete,
  isHealthSectionComplete,
  isProfileFieldsSectionComplete,
  type AccountProfileCheckInput,
} from "@shared/profileCompleteness";

export type SubscriptionSummary = {
  id: string;
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
  expiresAt: string | null;
};

type ProfileFormData = {
  name: string;
  primaryMobile: string;
  primaryMobileCountryCode: string;
  secondaryMobile: string;
  secondaryMobileCountryCode: string;
  emergencyMobile: string;
  emergencyMobileCountryCode: string;
  healthUpdateText: string;
  healthDocumentUrls: string[];
};

type MobileValidationState = {
  primaryMobile: { isValid: boolean; error: string };
  secondaryMobile: { isValid: boolean; error: string };
  emergencyMobile: { isValid: boolean; error: string };
};

type AccountContextValue = {
  user: User;
  section: AccountSection;
  isLoading: boolean;
  profileData: ProfileFormData;
  mobileValidation: MobileValidationState;
  confirmedHealth: ConfirmedHealthState;
  healthDropdownValue: HealthDisclosureChoice | "";
  isConcernsPanelOpen: boolean;
  subscriptions: SubscriptionSummary[];
  isProfileDirty: boolean;
  isHealthDirty: boolean;
  isProfileSectionIncomplete: boolean;
  isHealthSectionIncomplete: boolean;
  isProfileComplete: boolean;
  profileSubmitLabel: string;
  handleInputChange: (field: string, value: string) => void;
  handleCountryCodeChange: (field: string, value: string) => void;
  handleProfileSubmit: (e: React.FormEvent) => Promise<void>;
  handleHealthCancel: () => void;
  handleConfirmNoConcerns: () => void;
  handleOpenConcernsPanel: () => void;
  handlePanelCancel: () => void;
  handleConfirmConcerns: (payload: { concernsText: string; documentUrls: string[] }) => void;
  handleHealthSaveAndSubmit: () => Promise<void>;
  setIsConcernsPanelOpen: (open: boolean) => void;
  resetProfileFormFromUser: () => void;
  navigateToSessions: () => void;
  hasUnsavedChangesForSection: (section: AccountSection) => boolean;
  logout: () => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}

const scrollToSchedule = () => {
  window.location.href = "/?openBooking=true";
};

function profileFieldsFromUser(user: User): ProfileFormData {
  return {
    name: user.name || "",
    primaryMobile: user.primaryMobile || "",
    primaryMobileCountryCode: user.primaryMobileCountryCode || "+91",
    secondaryMobile: user.secondaryMobile || "",
    secondaryMobileCountryCode: user.secondaryMobileCountryCode || "+91",
    emergencyMobile: user.emergencyMobile || "",
    emergencyMobileCountryCode: user.emergencyMobileCountryCode || "+91",
    healthUpdateText: user.healthUpdateText || "",
    healthDocumentUrls: user.healthDocumentUrls || [],
  };
}

function mobileValidationFromProfile(next: ProfileFormData): MobileValidationState {
  return {
    primaryMobile: validateRequiredMobile(
      "primaryMobile",
      formatMobileNumber(next.primaryMobile),
      next.primaryMobileCountryCode,
    ),
    secondaryMobile: validateRequiredMobile(
      "secondaryMobile",
      formatMobileNumber(next.secondaryMobile),
      next.secondaryMobileCountryCode,
    ),
    emergencyMobile: validateRequiredMobile(
      "emergencyMobile",
      formatMobileNumber(next.emergencyMobile),
      next.emergencyMobileCountryCode,
    ),
  };
}

function isProfileFormDirty(user: User, profileData: ProfileFormData): boolean {
  const saved = profileFieldsFromUser(user);
  return (
    profileData.name !== saved.name ||
    profileData.primaryMobile !== saved.primaryMobile ||
    profileData.primaryMobileCountryCode !== saved.primaryMobileCountryCode ||
    profileData.secondaryMobile !== saved.secondaryMobile ||
    profileData.secondaryMobileCountryCode !== saved.secondaryMobileCountryCode ||
    profileData.emergencyMobile !== saved.emergencyMobile ||
    profileData.emergencyMobileCountryCode !== saved.emergencyMobileCountryCode
  );
}

function isHealthStateDirty(user: User, confirmedHealth: ConfirmedHealthState): boolean {
  const saved = confirmedHealthFromSavedText(user.healthUpdateText, user.healthDocumentUrls);
  return (
    confirmedHealth.choice !== saved.choice ||
    confirmedHealth.concernsText !== saved.concernsText ||
    JSON.stringify(confirmedHealth.documentUrls) !== JSON.stringify(saved.documentUrls)
  );
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const pathname = location.split("?")[0] || "/account";
  const section = getAccountSectionFromPath(pathname);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: "",
    primaryMobile: "",
    primaryMobileCountryCode: "+91",
    secondaryMobile: "",
    secondaryMobileCountryCode: "+91",
    emergencyMobile: "",
    emergencyMobileCountryCode: "+91",
    healthUpdateText: "",
    healthDocumentUrls: [],
  });

  const [mobileValidation, setMobileValidation] = useState<MobileValidationState>({
    primaryMobile: { isValid: true, error: "" },
    secondaryMobile: { isValid: true, error: "" },
    emergencyMobile: { isValid: true, error: "" },
  });

  const didInitHealthRef = useRef(false);
  const didJustPersistHealthRef = useRef(false);
  const [confirmedHealth, setConfirmedHealth] = useState<ConfirmedHealthState>({
    choice: "",
    concernsText: "",
    documentUrls: [],
  });
  const [healthDropdownValue, setHealthDropdownValue] = useState<HealthDisclosureChoice | "">("");
  const [isConcernsPanelOpen, setIsConcernsPanelOpen] = useState(false);

  const { data: subscriptions = [] } = useQuery<SubscriptionSummary[]>({
    queryKey: ["/api/subscriptions/my"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/my", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load subscriptions");
      return res.json();
    },
  });

  function syncHealthStateFromUser(saved: ConfirmedHealthState) {
    setConfirmedHealth(saved);
    setHealthDropdownValue(saved.choice);
    setIsConcernsPanelOpen(false);
  }

  const resetProfileFormFromUser = useCallback(() => {
    if (!user) return;
    const next = profileFieldsFromUser(user);
    setProfileData(next);
    setMobileValidation(mobileValidationFromProfile(next));
    syncHealthStateFromUser(
      confirmedHealthFromSavedText(user.healthUpdateText, user.healthDocumentUrls),
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (!user) return;
    const next = profileFieldsFromUser(user);
    setProfileData(next);
    setMobileValidation(mobileValidationFromProfile(next));

    const shouldSyncHealth = !didInitHealthRef.current || didJustPersistHealthRef.current;
    if (shouldSyncHealth) {
      syncHealthStateFromUser(
        confirmedHealthFromSavedText(user.healthUpdateText, user.healthDocumentUrls),
      );
      didInitHealthRef.current = true;
      didJustPersistHealthRef.current = false;
    }
  }, [user]);

  const handleInputChange = useCallback((field: string, value: string) => {
    let nextValue = value;
    if (
      field.includes("Mobile") &&
      field !== "primaryMobileCountryCode" &&
      field !== "secondaryMobileCountryCode" &&
      field !== "emergencyMobileCountryCode"
    ) {
      nextValue = formatMobileNumber(value);
    }

    setProfileData((prev) => {
      const next = { ...prev, [field]: nextValue };

      if (field === "primaryMobile" || field === "secondaryMobile" || field === "emergencyMobile") {
        const ccKey =
          field === "primaryMobile"
            ? "primaryMobileCountryCode"
            : field === "secondaryMobile"
              ? "secondaryMobileCountryCode"
              : "emergencyMobileCountryCode";
        const cc = next[ccKey as keyof typeof next] as string;
        const validation = validateRequiredMobile(
          field as "primaryMobile" | "secondaryMobile" | "emergencyMobile",
          nextValue,
          cc,
        );
        setMobileValidation((mv) => ({ ...mv, [field]: validation }));
      }

      return next;
    });
  }, []);

  const handleCountryCodeChange = useCallback((field: string, value: string) => {
    setProfileData((prev) => {
      const next = { ...prev, [field]: value };
      const mobileField = field.replace("CountryCode", "") as
        | "primaryMobile"
        | "secondaryMobile"
        | "emergencyMobile";
      const digits = formatMobileNumber((next[mobileField] as string) || "");
      const validation = validateRequiredMobile(mobileField, digits, value);
      setMobileValidation((mv) => ({ ...mv, [mobileField]: validation }));
      return next;
    });
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!profileData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }
    if (!profileData.primaryMobile.trim()) {
      toast({
        title: "Validation Error",
        description: "Primary mobile number is required",
        variant: "destructive",
      });
      return;
    }
    if (!profileData.emergencyMobile.trim()) {
      toast({
        title: "Validation Error",
        description: "Emergency mobile number is required",
        variant: "destructive",
      });
      return;
    }
    if (!mobileValidation.primaryMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Primary mobile: ${mobileValidation.primaryMobile.error}`,
        variant: "destructive",
      });
      return;
    }
    if (!mobileValidation.emergencyMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Emergency mobile: ${mobileValidation.emergencyMobile.error}`,
        variant: "destructive",
      });
      return;
    }
    if (profileData.secondaryMobile && !mobileValidation.secondaryMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Secondary mobile: ${mobileValidation.secondaryMobile.error}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile(profileData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated!",
      });
    } catch {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHealthCancel = () => {
    resetProfileFormFromUser();
    scrollToSchedule();
  };

  const handleConfirmNoConcerns = () => {
    const next: ConfirmedHealthState = { choice: "none", concernsText: "", documentUrls: [] };
    setConfirmedHealth(next);
    setHealthDropdownValue("none");
    setIsConcernsPanelOpen(false);
  };

  const handleOpenConcernsPanel = () => {
    setHealthDropdownValue("concerns");
    setIsConcernsPanelOpen(true);
  };

  const handlePanelCancel = () => {
    setHealthDropdownValue(confirmedHealth.choice);
    setIsConcernsPanelOpen(false);
  };

  const handleConfirmConcerns = (payload: { concernsText: string; documentUrls: string[] }) => {
    const next: ConfirmedHealthState = {
      choice: "concerns",
      concernsText: payload.concernsText,
      documentUrls: payload.documentUrls,
    };
    setConfirmedHealth(next);
    setHealthDropdownValue("concerns");
    setIsConcernsPanelOpen(false);
  };

  const handleHealthSaveAndSubmit = async () => {
    if (!user?.id) return;

    if (!profileData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!profileData.primaryMobile.trim()) {
      toast({
        title: "Validation Error",
        description: "Primary mobile number is required",
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!profileData.emergencyMobile.trim()) {
      toast({
        title: "Validation Error",
        description: "Emergency mobile number is required",
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!mobileValidation.primaryMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Primary mobile: ${mobileValidation.primaryMobile.error}`,
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!mobileValidation.emergencyMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Emergency mobile: ${mobileValidation.emergencyMobile.error}`,
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (profileData.secondaryMobile && !mobileValidation.secondaryMobile.isValid) {
      toast({
        title: "Validation Error",
        description: `Secondary mobile: ${mobileValidation.secondaryMobile.error}`,
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!user.emailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email before continuing.",
        variant: "destructive",
      });
      setLocation(ACCOUNT_ROUTES.profile);
      return;
    }
    if (!confirmedHealth.choice) {
      toast({
        title: "Health disclosure required",
        description: "Please select and confirm your health disclosure before submitting.",
        variant: "destructive",
      });
      return;
    }

    const healthDraftValidation = validateHealthDisclosureDraft(
      confirmedHealth.choice,
      confirmedHealth.choice === "concerns" ? confirmedHealth.concernsText : HEALTH_NO_CONCERNS_TEXT,
    );
    if (!healthDraftValidation.valid) {
      toast({
        title: "Health concerns details required",
        description: healthDraftValidation.message ?? "Please complete your health disclosure.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    didJustPersistHealthRef.current = true;
    try {
      await updateProfile({
        ...profileData,
        healthUpdateText: confirmedHealthToUpdateText(confirmedHealth),
        healthDocumentUrls: confirmedHealth.documentUrls,
      });
      scrollToSchedule();
    } catch (error) {
      console.error("Health Save and Submit error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savedProfileInput: AccountProfileCheckInput = useMemo(
    () => ({
      emailVerified: Boolean(user?.emailVerified),
      name: user?.name,
      primaryMobile: user?.primaryMobile,
      primaryMobileCountryCode: user?.primaryMobileCountryCode,
      secondaryMobile: user?.secondaryMobile,
      secondaryMobileCountryCode: user?.secondaryMobileCountryCode,
      emergencyMobile: user?.emergencyMobile,
      emergencyMobileCountryCode: user?.emergencyMobileCountryCode,
      healthUpdateText: user?.healthUpdateText,
    }),
    [user],
  );

  const isProfileDirty = user ? isProfileFormDirty(user, profileData) : false;
  const isHealthDirty = user ? isHealthStateDirty(user, confirmedHealth) : false;
  const isProfileSectionIncomplete = !isProfileFieldsSectionComplete(savedProfileInput);
  const isHealthSectionIncomplete = !isHealthSectionComplete(savedProfileInput);
  const isProfileComplete = isAccountProfileComplete({
    ...savedProfileInput,
    healthUpdateText: confirmedHealthToUpdateText(confirmedHealth),
  });
  const profileSubmitLabel = isProfileComplete ? "Update Profile" : "Complete Profile";

  const navigateToSessions = useCallback(() => {
    setLocation(ACCOUNT_ROUTES.sessions);
  }, [setLocation]);

  const hasUnsavedChangesForSection = useCallback(
    (target: AccountSection) => {
      if (target === "profile") return isProfileDirty;
      if (target === "health") return isProfileDirty || isHealthDirty;
      return false;
    },
    [isProfileDirty, isHealthDirty],
  );

  if (!user) return null;

  const value: AccountContextValue = {
    user,
    section,
    isLoading,
    profileData,
    mobileValidation,
    confirmedHealth,
    healthDropdownValue,
    isConcernsPanelOpen,
    subscriptions,
    isProfileDirty,
    isHealthDirty,
    isProfileSectionIncomplete,
    isHealthSectionIncomplete,
    isProfileComplete,
    profileSubmitLabel,
    handleInputChange,
    handleCountryCodeChange,
    handleProfileSubmit,
    handleHealthCancel,
    handleConfirmNoConcerns,
    handleOpenConcernsPanel,
    handlePanelCancel,
    handleConfirmConcerns,
    handleHealthSaveAndSubmit,
    setIsConcernsPanelOpen,
    resetProfileFormFromUser,
    navigateToSessions,
    hasUnsavedChangesForSection,
    logout,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
