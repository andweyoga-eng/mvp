import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getAuthHeaders, getAuthToken, setAuthToken } from "@/lib/auth";
import {
  getCheckoutAuthHeaders,
  setGuestCheckoutToken,
  clearGuestCheckoutSession,
  getGuestCheckoutToken,
} from "@/lib/guest-checkout";
import { readResponseJson } from "@/lib/queryClient";
import {
  filterBookableSessions,
  isSessionUpcoming,
  sessionDurationMinutes,
} from "@/lib/booking-flow";
import {
  isSessionBookable,
  isTrialOrDropIn,
  TRIAL_DROPIN_MIDSESSION_MESSAGE,
} from "@shared/booking-eligibility";
import {
  sanitizeGuestPhoneInput,
  validateRequiredGuestPhone,
} from "@shared/guest-phone";
import {
  type GuestFieldKey,
  validateGuestField,
  validateGuestForm,
  guestFormHasErrors,
  firstGuestFormError,
} from "@shared/guest-booking-form";
import { MAX_TEXT_LENGTH, limitTextInput } from "@shared/input-limits";
import { AuthHoverPopup } from "@/components/auth-hover-popup";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { isAuthUserProfileComplete } from "@/lib/account-profile-complete";
import { getAccountProfileIncompleteReasons } from "@shared/profileCompleteness";
import { AlertTriangle, User, ExternalLink, CreditCard, Sparkles, Video, Download } from "lucide-react";
import {
  type MemberBookingResult,
  type PaymentVerifyResult,
  formatSessionPrice,
  openRazorpayPayment,
  isValidPaymentUrl,
  syncPaymentStatusAfterVerifyFailure,
} from "@/lib/booking-payment";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassType, Class } from "@shared/schema";
import { setPendingBooking, clearPendingBooking } from "@/lib/pending-booking";
import {
  fetchMemberSessions,
  findUpcomingMemberSessionForClass,
  findUpcomingPendingSessionForClass,
  memberSessionsQueryKey,
} from "@/lib/member-sessions";
import {
  MY_SESSIONS_UPCOMING_URL,
  markMemberLandingChecked,
} from "@/lib/member-landing";
import {
  PAYMENT_PROCESSING_FOOTER,
  PAYMENT_PROCESSING_MESSAGES,
  type PaymentProcessingPhase,
} from "@/lib/payment-processing-messages";
import { Loader2 } from "lucide-react";
import {
  ManualPaymentReferenceBlock,
  ManualPaymentSubmittedMessage,
} from "@/components/manual-payment-reference-block";
import { PaymentConfirmedContent } from "@/components/payment-confirmed-dialog";
import { GuestBookingConfirmedContent } from "@/components/guest-booking-confirmed-dialog";
import { LEGAL_CONFIG } from "@shared/legal-config";
import { MANUAL_PAYMENT_SUBMITTED_TOAST } from "@shared/manual-payment-ack";
import { CONSENT_COPY, type ConsentLanguage } from "@shared/consent";
import { detectConsentLanguage } from "@/lib/consent-language";
import { Link } from "wouter";
import { AlreadyBookedSessionContent } from "@/components/already-booked-session-content";
import { Badge } from "@/components/ui/badge";
import { getSessionBadgeLabel } from "@/lib/session-badges";
import { DEFAULT_SESSION_DURATION_MINUTES } from "@shared/session-window";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Scheduled session id (from Week Schedule). */
  sessionId?: string | null;
  /** Class type id (from and We Flow). User picks an upcoming session of this type. */
  filterClassTypeId?: string | null;
  /** Resume payment for an existing held booking (email retry link). */
  resumeBookingId?: string | null;
}

interface EnrichedClass extends Class {
  classType: ClassType;
  instructor: {
    id: string;
    name: string;
  };
}

export default function BookingModal({
  isOpen,
  onClose,
  sessionId,
  filterClassTypeId,
  resumeBookingId,
}: BookingModalProps) {
  const [formData, setFormData] = useState({
    classId: sessionId || "",
  });
  const [paymentResult, setPaymentResult] = useState<MemberBookingResult | null>(null);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentVerifyResult | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    | "pay"
    | "manual-submitted"
    | "payment-confirmed"
    | "guest-confirmed"
    | "email-registered"
    | "success"
    | "failed"
    | "already-booked"
    | "next-batch"
  >("pay");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentProcessingPhase | null>(null);
  const [alreadyBookedView, setAlreadyBookedView] = useState<{
    className: string;
    instructorName: string;
    sessionDate: string;
  } | null>(null);
  const [guestBooking, setGuestBooking] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [guestFieldErrors, setGuestFieldErrors] = useState<Record<GuestFieldKey, string>>({
    name: "",
    email: "",
    phone: "",
  });
  const [guestFormBanner, setGuestFormBanner] = useState("");
  const [guestConsent, setGuestConsent] = useState({
    profile: false,
    terms: false,
    age: false,
  });
  const [consentLang, setConsentLang] = useState<ConsentLanguage>(detectConsentLanguage);
  const guestCopy = CONSENT_COPY[consentLang];
  const [nextBatchPrompt, setNextBatchPrompt] = useState<{ id: string; date: string } | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const resumeCheckoutStartedRef = useRef(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const clearGuestFormError = () => setGuestFormBanner("");

  const updateGuestField = (field: GuestFieldKey, value: string) => {
    setGuestBooking((g) => ({ ...g, [field]: value }));
    setGuestFieldErrors((e) => ({ ...e, [field]: "" }));
    clearGuestFormError();
  };

  const handleGuestFieldBlur = (field: GuestFieldKey) => {
    const message = validateGuestField(field, guestBooking[field]) ?? "";
    setGuestFieldErrors((e) => ({ ...e, [field]: message }));
  };

  const showGuestCheckoutError = (
    message: string,
    fieldErrors?: Partial<Record<GuestFieldKey, string>>,
  ) => {
    setGuestFormBanner(message);
    if (fieldErrors) {
      setGuestFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  };

  const validateGuestCheckoutForm = (): boolean => {
    const errors = validateGuestForm(guestBooking);
    setGuestFieldErrors(errors);
    if (guestFormHasErrors(errors)) {
      showGuestCheckoutError(
        firstGuestFormError(errors) ?? "Please fix the highlighted fields before continuing.",
      );
      return false;
    }
    if (!guestConsent.terms || !guestConsent.age) {
      showGuestCheckoutError("Please accept the terms and age declaration before payment.");
      return false;
    }
    clearGuestFormError();
    return true;
  };
  const isProfileComplete = isAuthUserProfileComplete(user);
  const hasPreselectedSession = !!sessionId;
  const hasClassTypeFilter = !!filterClassTypeId && !sessionId;

  const getProfileIssues = () => {
    if (!user) return [];
    return getAccountProfileIncompleteReasons({
      emailVerified: user.emailVerified,
      name: user.name,
      primaryMobile: user.primaryMobile,
      primaryMobileCountryCode: user.primaryMobileCountryCode,
      secondaryMobile: user.secondaryMobile,
      secondaryMobileCountryCode: user.secondaryMobileCountryCode,
      emergencyMobile: user.emergencyMobile,
      emergencyMobileCountryCode: user.emergencyMobileCountryCode,
      healthUpdateText: user.healthUpdateText,
    });
  };

  const { data: allClasses } = useQuery<EnrichedClass[]>({
    queryKey: ["/api/classes"],
    enabled: isOpen,
  });

  const { data: classTypes } = useQuery<ClassType[]>({
    queryKey: ["/api/class-types"],
    enabled: isOpen && hasClassTypeFilter,
  });

  const filteredClassType = classTypes?.find((ct) => ct.id === filterClassTypeId);

  const { data: selectedClass, isLoading: selectedClassLoading, isError: selectedClassError } =
    useQuery<EnrichedClass>({
      queryKey: ["/api/classes", sessionId],
      enabled: isOpen && hasPreselectedSession && !!sessionId,
      retry: 1,
    });

  const displayClass =
    selectedClass ??
    (hasPreselectedSession ? allClasses?.find((c) => c.id === sessionId) : undefined);

  const getAvailableClasses = useMemo(() => {
    if (!allClasses) return [];
    let list = filterBookableSessions(allClasses);
    if (hasClassTypeFilter && filterClassTypeId) {
      list = list.filter(
        (cls) =>
          cls.classType?.id === filterClassTypeId || cls.classTypeId === filterClassTypeId,
      );
    }
    return list;
  }, [allClasses, hasClassTypeFilter, filterClassTypeId]);

  const displayClassDuration = displayClass
    ? sessionDurationMinutes(displayClass)
    : DEFAULT_SESSION_DURATION_MINUTES;
  const preselectedIsBookable =
    !!displayClass &&
    isSessionBookable(
      displayClass.date,
      displayClassDuration,
      (displayClass as { sessionFrequency?: string }).sessionFrequency,
    ) &&
    displayClass.currentBookings < displayClass.maxCapacity;

  const guestPreselectedLoading =
    hasPreselectedSession &&
    !hasClassTypeFilter &&
    !displayClass &&
    !selectedClassError &&
    (selectedClassLoading || allClasses === undefined);

  const resolvedSessionId = formData.classId || sessionId || "";
  const selectedSession = useMemo(() => {
    if (!resolvedSessionId) return undefined;
    return (
      allClasses?.find((c) => c.id === resolvedSessionId) ??
      (displayClass?.id === resolvedSessionId ? displayClass : undefined)
    );
  }, [resolvedSessionId, allClasses, displayClass]);

  const selectedPriceLabel = formatSessionPrice(selectedSession?.classType?.price);
  const selectedPaymentLink = isValidPaymentUrl(selectedSession?.razorpayLink)
    ? selectedSession!.razorpayLink
    : null;
  const guestEligibleSession =
    selectedSession ??
    (hasPreselectedSession && displayClass ? (displayClass as EnrichedClass) : undefined);
  const canGuestBook =
    (guestEligibleSession as { sessionFrequency?: string } | undefined)?.sessionFrequency ===
      "drop_in" ||
    (guestEligibleSession as { sessionFrequency?: string } | undefined)?.sessionFrequency ===
      "trial";

  const bookingSessionIsTrialDropIn = useMemo(() => {
    const freq =
      (selectedSession as { sessionFrequency?: string } | undefined)?.sessionFrequency ??
      (displayClass as { sessionFrequency?: string } | undefined)?.sessionFrequency;
    return isTrialOrDropIn(freq);
  }, [selectedSession, displayClass]);

  const canAccessCheckoutUi =
    !!user || !!getAuthToken() || !!getGuestCheckoutToken();

  const checkoutAuthHeaders = () =>
    getCheckoutAuthHeaders({
      preferGuest:
        !!paymentResult?.isGuestCheckout || (!user && !!getGuestCheckoutToken()),
    });

  useEffect(() => {
    if (!isOpen) {
      setPaymentResult(null);
      setPaymentOutcome(null);
      setPaymentStep("pay");
      setAlreadyBookedView(null);
      setIsPaying(false);
      setPaymentPhase(null);
      setGuestConsent({ profile: false, terms: false, age: false });
      setGuestFieldErrors({ name: "", email: "", phone: "" });
      setGuestFormBanner("");
      setNextBatchPrompt(null);
      setWaitlistEmail("");
      resumeCheckoutStartedRef.current = false;
      clearGuestCheckoutSession();
      return;
    }
    const scrollTo = sessionId ? "schedule" : filterClassTypeId ? "teach" : "schedule";
    setPendingBooking({
      sessionId: sessionId || undefined,
      classTypeId: filterClassTypeId || undefined,
      scrollTo,
    });
    if (sessionId) {
      setFormData({ classId: sessionId });
    } else {
      setFormData({ classId: "" });
    }
  }, [isOpen, sessionId, filterClassTypeId]);

  useEffect(() => {
    if (!isOpen || sessionId || !filterClassTypeId || getAvailableClasses.length !== 1) return;
    if (!formData.classId) {
      setFormData({ classId: getAvailableClasses[0].id });
    }
  }, [isOpen, sessionId, filterClassTypeId, getAvailableClasses, formData.classId]);

  useEffect(() => {
    if (!isOpen || hasPreselectedSession || !formData.classId) return;
    const stillValid = getAvailableClasses.some((c) => c.id === formData.classId);
    if (!stillValid) setFormData({ classId: "" });
  }, [isOpen, hasPreselectedSession, formData.classId, getAvailableClasses]);

  const { data: memberSessions = [] } = useQuery({
    queryKey: memberSessionsQueryKey(user?.id ?? ""),
    queryFn: fetchMemberSessions,
    enabled: !!user?.id && isOpen,
    refetchOnWindowFocus: true,
    refetchInterval: paymentStep === "manual-submitted" ? 4000 : false,
    retry: 1,
  });

  const showAlreadyBookedForClass = (classId: string): boolean => {
    const existing = findUpcomingMemberSessionForClass(memberSessions, classId);
    if (!existing) {
      if (paymentStep === "already-booked") {
        setPaymentStep("pay");
        setAlreadyBookedView(null);
      }
      return false;
    }
    setAlreadyBookedView({
      className: existing.className,
      instructorName: existing.instructorName,
      sessionDate: existing.date,
    });
    setPaymentStep("already-booked");
    return true;
  };

  useEffect(() => {
    if (!isOpen || !user || paymentResult) return;
    const classId = formData.classId || sessionId || "";
    if (!classId) return;

    const existing = findUpcomingMemberSessionForClass(memberSessions, classId);
    if (existing) {
      setAlreadyBookedView({
        className: existing.className,
        instructorName: existing.instructorName,
        sessionDate: existing.date,
      });
      setPaymentStep("already-booked");
      return;
    }

    setPaymentStep((step) => (step === "already-booked" ? "pay" : step));
    setAlreadyBookedView((view) => (view ? null : view));
  }, [isOpen, user, formData.classId, sessionId, memberSessions, paymentResult]);

  const bookingMutation = useMutation({
    mutationFn: async (payload: {
      classId: string;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
    }): Promise<MemberBookingResult> => {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await readResponseJson<Record<string, unknown>>(response);

      if (!response.ok) {
        if (response.status === 409 && result.requiresHealthUpdate) {
          throw {
            status: 409,
            requiresHealthUpdate: true,
            redirectTo: (result.redirectTo as string) || "/my-account#profile",
            message: (result.message as string) || "Health profile required",
            code: (result.code as string) || "profile_incomplete",
          };
        }

        if (response.status === 409 && result.code === "session_in_progress_dropin") {
          throw {
            status: 409,
            code: "session_in_progress_dropin",
            message: (result.message as string) || TRIAL_DROPIN_MIDSESSION_MESSAGE,
          };
        }

        if (response.status === 409 && result.code === "already_booked") {
          throw {
            status: 409,
            code: "already_booked",
            message: (result.message as string) || "You have already booked this session.",
          };
        }

        if (response.status === 409 && result.code === "email_registered") {
          throw {
            status: 409,
            code: "email_registered",
            message:
              (result.message as string) ||
              "This email is already registered. Sign in to book this session.",
          };
        }

        if (response.status === 409 && result.code === "guest_booking_processing") {
          throw {
            status: 409,
            code: "guest_booking_processing",
            message: (result.message as string) || "Your booking is being processed.",
            resumeCheckout: result.resumeCheckout ?? null,
          };
        }

        if (response.status === 409 && result.code === "guest_booking_confirmed") {
          throw {
            status: 409,
            code: "guest_booking_confirmed",
            message: (result.message as string) || "You are already booked for this session.",
          };
        }

        const zodErrors = result.errors as Array<{ message?: string }> | undefined;
        const detail =
          zodErrors?.[0]?.message ||
          (result.message as string) ||
          `Request failed with status ${response.status}`;

        throw {
          status: response.status,
          message: detail,
          code: typeof result.code === "string" ? result.code : undefined,
          nextBatch:
            result.nextBatch && typeof result.nextBatch === "object"
              ? (result.nextBatch as { id?: string; date?: string })
              : undefined,
        };
      }

      return result as unknown as MemberBookingResult;
    },
    onSuccess: async (result) => {
      clearPendingBooking();
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/week"] });
      queryClient.invalidateQueries({ queryKey: ["/api/class-types-availability/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });

      const isGuestResult = !!result.isGuestCheckout;

      if (isGuestResult && result.guestCheckoutToken) {
        setAuthToken(null);
        setGuestCheckoutToken(result.guestCheckoutToken);
      } else if (result.token) {
        setAuthToken(result.token);
      }

      if (result.useRazorpayCheckout && result.razorpayKeyId) {
        setPaymentResult(result);
        setPaymentStep("pay");
        if (!isGuestResult && result.token) {
          await refreshUser();
        }
        await startRazorpayCheckout(result);
        return;
      }

      if (!isGuestResult && result.token) {
        await refreshUser();
      }

      if (result.useQrPayment && result.qrPayment) {
        setPaymentResult(result);
        setPaymentStep("pay");
        toast({
          title: "Spot reserved",
          description:
            "Scan the QR code, pay, then enter the last 4 characters of your payment reference.",
        });
        return;
      }

      if (isValidPaymentUrl(result.razorpayLink)) {
        setPaymentResult(result);
        setPaymentStep("pay");
        toast({
          title: "Spot reserved",
          description:
            "Complete payment on the link, then enter the last 4 characters of your payment reference.",
        });
        return;
      }

      if (isGuestResult) {
        setPaymentResult(result);
        setPaymentStep("guest-confirmed");
        return;
      }

      toast({
        title: "Booking confirmed!",
        description:
          "Your spot is reserved. Our team will share payment details if needed.",
      });
      setFormData({ classId: "" });
      onClose();
    },
    onError: (error: {
      status?: number;
      requiresHealthUpdate?: boolean;
      redirectTo?: string;
      message?: string;
      code?: string;
      nextBatch?: { id?: string; date?: string } | null;
      resumeCheckout?: MemberBookingResult | null;
    }) => {
      if (error.status === 409 && error.requiresHealthUpdate) {
        onClose();

        toast({
          title: "Profile Incomplete",
          description:
            "Please complete your profile (name, mobiles, verified email, and health update) to book sessions.",
          variant: "destructive",
        });

        setTimeout(() => {
          setLocation(error.redirectTo || "/my-account#profile");
        }, 100);

        return;
      }

      if (error.status === 409 && error.code === "already_booked") {
        const classId = formData.classId || sessionId || "";
        const chosen =
          allClasses?.find((c) => c.id === classId) ??
          (displayClass?.id === classId ? displayClass : undefined);
        const existing = findUpcomingMemberSessionForClass(memberSessions, classId);
        setAlreadyBookedView({
          className: existing?.className ?? chosen?.classType.name ?? "This session",
          instructorName: existing?.instructorName ?? chosen?.instructor.name ?? "",
          sessionDate: toSessionDateString(
            existing?.date ?? chosen?.date ?? new Date().toISOString(),
          ),
        });
        setPaymentStep("already-booked");
        return;
      }

      if (error.status === 409 && error.code === "session_in_progress_dropin") {
        toast({
          title: "Join the next session",
          description: error.message || TRIAL_DROPIN_MIDSESSION_MESSAGE,
        });
        return;
      }

      if (error.status === 409 && error.code === "email_registered") {
        setPaymentStep("email-registered");
        return;
      }

      if (error.status === 409 && error.code === "guest_booking_processing") {
        if (error.resumeCheckout?.guestCheckoutToken) {
          setAuthToken(null);
          setGuestCheckoutToken(error.resumeCheckout.guestCheckoutToken);
          setPaymentResult(error.resumeCheckout);
          setPaymentStep("pay");
          toast({
            title: "Payment pending",
            description: error.message,
          });
          if (error.resumeCheckout.useRazorpayCheckout && error.resumeCheckout.razorpayKeyId) {
            void startRazorpayCheckout(error.resumeCheckout);
          }
          return;
        }
        toast({
          title: "Booking in progress",
          description: error.message,
        });
        return;
      }

      if (error.status === 409 && error.code === "guest_booking_confirmed") {
        toast({
          title: "Already booked",
          description: error.message,
        });
        return;
      }

      if (error.status === 409 && error.code === "next_batch_only") {
        const nextBatch =
          error.nextBatch && typeof error.nextBatch === "object"
            ? (error.nextBatch as { id?: string; date?: string })
            : null;
        setNextBatchPrompt(
          nextBatch?.id && nextBatch?.date
            ? {
                id: nextBatch.id,
                date: nextBatch.date,
              }
            : null,
        );
        setPaymentStep("next-batch");
        return;
      }

      if (!user) {
        const message = error.message || "Please try again or contact support.";
        const fieldErrors: Partial<Record<GuestFieldKey, string>> = {};
        if (/email/i.test(message)) fieldErrors.email = message;
        if (/phone|mobile/i.test(message)) fieldErrors.phone = message;
        if (/name/i.test(message)) fieldErrors.name = message;
        showGuestCheckoutError(message, fieldErrors);
        return;
      }

      toast({
        title: "Booking failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (bookingMutation.isPending || isPaying) return;

    if (!user && !canGuestBook) return;

    if (user && !isProfileComplete && !bookingSessionIsTrialDropIn) {
      onClose();

      toast({
        title: "Profile Incomplete",
        description:
          "Please complete your profile (name, mobiles, verified email, and health update) before booking sessions.",
        variant: "destructive",
      });

      setTimeout(() => {
        setLocation("/my-account#profile");
      }, 100);

      return;
    }

    const classId = formData.classId || sessionId || "";
    if (!classId) {
      toast({
        title: "Please select a class",
        description: hasClassTypeFilter
          ? "Choose an upcoming session for this class type."
          : "Class selection is required.",
        variant: "destructive",
      });
      return;
    }

    const chosen =
      allClasses?.find((c) => c.id === classId) ??
      (displayClass?.id === classId ? displayClass : undefined);
    if (
      chosen &&
      !isSessionBookable(
        chosen.date,
        sessionDurationMinutes(chosen),
        (chosen as { sessionFrequency?: string }).sessionFrequency,
      )
    ) {
      const isTrialDropIn =
        (chosen as { sessionFrequency?: string }).sessionFrequency === "trial" ||
        (chosen as { sessionFrequency?: string }).sessionFrequency === "drop_in";
      toast({
        title: isTrialDropIn ? "Session already in progress" : "Session has ended",
        description: isTrialDropIn
          ? TRIAL_DROPIN_MIDSESSION_MESSAGE
          : "Please pick another upcoming session from the list.",
        variant: "destructive",
      });
      return;
    }

    if (showAlreadyBookedForClass(classId)) return;

    const pendingSession = user
      ? findUpcomingPendingSessionForClass(memberSessions, classId)
      : undefined;
    if (pendingSession && paymentResult?.bookingId === pendingSession.bookingId) {
      if (paymentResult.useRazorpayCheckout && paymentResult.razorpayKeyId) {
        void startRazorpayCheckout(paymentResult);
      }
      return;
    }

    const payload: Record<string, string | boolean> = { classId };
    if (!user && canGuestBook) {
      if (!validateGuestCheckoutForm()) return;
      const phoneCheck = validateRequiredGuestPhone(guestBooking.phone);
      if (!phoneCheck.ok) return;
      payload.guestName = guestBooking.name.trim();
      payload.guestEmail = guestBooking.email.trim();
      payload.guestPhone = phoneCheck.normalized;
      payload.guestConsentProfile = true;
      payload.guestConsentTerms = true;
      payload.guestConsentAge = true;
      payload.consentVersion = LEGAL_CONFIG.documentVersion;
    }

    bookingMutation.mutate(payload as { classId: string });
  };

  const handleGoToProfile = () => {
    onClose();
    setLocation("/my-account#profile");
  };

  const goToMySessionsUpcoming = () => {
    clearPendingBooking();
    clearGuestCheckoutSession();
    setPaymentResult(null);
    setPaymentOutcome(null);
    setPaymentStep("pay");
    setIsPaying(false);
    setPaymentPhase(null);
    markMemberLandingChecked();
    onClose();
    setLocation(MY_SESSIONS_UPCOMING_URL);
  };

  const goToHomeCarousel = () => {
    clearPendingBooking();
    clearGuestCheckoutSession();
    setPaymentResult(null);
    setPaymentOutcome(null);
    setPaymentStep("pay");
    setIsPaying(false);
    setPaymentPhase(null);
    onClose();
    setLocation("/");
    setTimeout(() => {
      document.getElementById("home")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleGuestSignUp = () => {
    window.location.href = "/api/auth/google";
  };

  const startRazorpayCheckout = async (booking: MemberBookingResult) => {
    if (!booking.bookingId || !booking.razorpayKeyId) return;
    const payerName = user?.name?.trim() || guestBooking.name.trim();
    const payerEmail = user?.email?.trim() || guestBooking.email.trim();
    if (!payerName || !payerEmail) return;
    setIsPaying(true);
    setPaymentPhase("creating-order");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ bookingId: booking.bookingId }),
      });
      const orderData = await readResponseJson<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        paymentId: string;
        message?: string;
      }>(orderRes);

      if (!orderRes.ok) {
        const authHint =
          orderRes.status === 401
            ? " Your checkout session may have expired — close and book again, or sign in."
            : "";
        throw new Error((orderData.message || "Could not start payment") + authHint);
      }

      setPaymentPhase("opening-checkout");
      await openRazorpayCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "andWeYoga",
        description: booking.className,
        prefill: {
          name: payerName,
          email: payerEmail,
          contact: user?.primaryMobile ?? (guestBooking.phone.trim() || undefined),
        },
        onModalOpen: () => setPaymentPhase("checkout-open"),
        onSuccess: async (rzp) => {
          setPaymentPhase("verifying");
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...checkoutAuthHeaders() },
              credentials: "include",
              body: JSON.stringify({
                paymentId: orderData.paymentId,
                razorpay_order_id: rzp.razorpay_order_id,
                razorpay_payment_id: rzp.razorpay_payment_id,
                razorpay_signature: rzp.razorpay_signature,
              }),
            });
            const verified = await readResponseJson<PaymentVerifyResult>(verifyRes);
            let paymentConfirmed = verifyRes.ok && verified.success ? verified : null;
            if (!paymentConfirmed) {
              paymentConfirmed = await syncPaymentStatusAfterVerifyFailure(
                orderData.paymentId,
                checkoutAuthHeaders(),
              );
            }
            if (!paymentConfirmed) {
              throw new Error(verified.message || "Payment verification failed");
            }
            setPaymentOutcome(paymentConfirmed);
            queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
            if (paymentConfirmed.isGuestCheckout || booking.isGuestCheckout) {
              setPaymentStep("guest-confirmed");
            } else {
              toast({
                title: "You're in!",
                description: "Payment received — see you on the mat.",
              });
              goToMySessionsUpcoming();
            }
          } catch (err) {
            setPaymentStep("failed");
            toast({
              title: "Payment verification failed",
              description: err instanceof Error ? err.message : "Please try again or contact support.",
              variant: "destructive",
            });
          } finally {
            setIsPaying(false);
            setPaymentPhase(null);
          }
        },
        onDismiss: () => {
          void (async () => {
            setIsPaying(false);
            setPaymentPhase(null);
            try {
              await fetch(`/api/bookings/${booking.bookingId}/cancel-checkout`, {
                method: "PATCH",
                credentials: "include",
                headers: getCheckoutAuthHeaders({ preferGuest: true }),
              });
              clearGuestCheckoutSession();
              setPaymentResult(null);
              setPaymentStep("pay");
              toast({
                title: "Checkout cancelled",
                description: "Your spot has been released.",
              });
            } catch {
              toast({
                title: "Could not cancel checkout",
                variant: "destructive",
              });
            }
          })();
        },
        onPaymentFailed: () => {
          void (async () => {
            setIsPaying(false);
            setPaymentPhase(null);
            setPaymentStep("failed");
            try {
              await fetch(`/api/bookings/${booking.bookingId}/payment-failed`, {
                method: "POST",
                credentials: "include",
                headers: getCheckoutAuthHeaders({ preferGuest: true }),
              });
              toast({
                title: "Payment failed",
                description:
                  "We've held your spot for 10 minutes. Check your email for a retry link.",
                variant: "destructive",
              });
            } catch {
              toast({
                title: "Payment failed",
                description: "Check your email or try again shortly.",
                variant: "destructive",
              });
            }
          })();
        },
      });
    } catch (err) {
      setIsPaying(false);
      setPaymentPhase(null);
      setPaymentStep("failed");
      toast({
        title: "Payment could not start",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isOpen || !resumeBookingId) return;
    if (resumeCheckoutStartedRef.current) return;
    resumeCheckoutStartedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/bookings/${resumeBookingId}/resume-checkout`, {
          headers: getCheckoutAuthHeaders({ preferGuest: true }),
          credentials: "include",
        });
        const data = await readResponseJson<
          MemberBookingResult & {
            guestName?: string;
            guestEmail?: string;
            guestPhone?: string;
            message?: string;
          }
        >(res);
        if (cancelled) return;

        if (!res.ok) {
          toast({
            title: "Cannot resume payment",
            description: data.message || "This checkout session is no longer available.",
            variant: "destructive",
          });
          onClose();
          return;
        }

        if (data.guestCheckoutToken) {
          setAuthToken(null);
          setGuestCheckoutToken(data.guestCheckoutToken);
        }
        if (data.guestName || data.guestEmail || data.guestPhone) {
          setGuestBooking({
            name: data.guestName ?? "",
            email: data.guestEmail ?? "",
            phone: data.guestPhone ?? "",
          });
        }
        if (data.classId) {
          setFormData({ classId: data.classId });
        }
        setPaymentResult(data);
        setPaymentStep("pay");

        if (data.useRazorpayCheckout && data.razorpayKeyId) {
          await startRazorpayCheckout(data);
        } else {
          toast({
            title: "Payment pending",
            description: "Complete payment using the options shown.",
          });
        }
      } catch {
        if (!cancelled) {
          toast({
            title: "Could not resume checkout",
            description: "Please try the link again or contact support.",
            variant: "destructive",
          });
          onClose();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, resumeBookingId, onClose, toast]);

  const formatClassOption = (cls: EnrichedClass) => {
    const date = new Date(cls.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${cls.classType.name} with ${cls.instructor.name} — ${dateStr} at ${timeStr} (${cls.currentBookings}/${cls.maxCapacity})`;
  };

  const showSessionPicker = !hasPreselectedSession;
  const hideDialogClose =
    !!user &&
    (!paymentResult ||
      paymentStep === "pay" ||
      paymentStep === "failed" ||
      isPaying ||
      !!paymentPhase);

  const processingCopy = paymentPhase
    ? PAYMENT_PROCESSING_MESSAGES[paymentPhase]
    : null;

  const handleJoinNextBatch = () => {
    if (!nextBatchPrompt?.id) return;
    const nextId = nextBatchPrompt.id;
    setNextBatchPrompt(null);
    setPaymentStep("pay");
    setFormData({ classId: nextId });
    bookingMutation.mutate({ classId: nextId });
  };

  const handleBrowseUpcomingFromSchedule = () => {
    const classTypeId =
      selectedSession?.classTypeId ?? displayClass?.classTypeId ?? filterClassTypeId ?? undefined;
    setPendingBooking({
      classTypeId,
      scrollTo: "schedule",
    });
    onClose();
    setLocation("/");
  };

  const handleWaitlistJoin = async () => {
    const classTypeId =
      selectedSession?.classTypeId ?? displayClass?.classTypeId ?? filterClassTypeId ?? null;
    if (!classTypeId) return;
    const email = user?.email ?? waitlistEmail.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please share your email to join the waitlist.",
        variant: "destructive",
      });
      return;
    }
    const res = await fetch(`/api/class-types/${classTypeId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      toast({ title: "Could not join waitlist", variant: "destructive" });
      return;
    }
    toast({
      title: "Added to waitlist",
      description: "We will email you when the next batch opens.",
    });
    onClose();
  };

  useEffect(() => {
    if (paymentStep !== "manual-submitted" || !paymentResult?.bookingId) return;
    if (paymentResult.isGuestCheckout) return;
    const current = memberSessions.find((s) => s.bookingId === paymentResult.bookingId);
    if (!current || current.paymentStatus !== "paid") return;
    setPaymentOutcome({
      success: true,
      bookingId: paymentResult.bookingId,
      classId: paymentResult.classId,
      className: current.className,
      instructorName: current.instructorName,
      sessionDate: current.date,
      googleMeetLink: current.googleMeetLink,
      paymentStatus: current.paymentStatus,
      receiptUrl: current.receiptUrl,
      invoiceUrl: current.invoiceUrl,
    });
    setPaymentStep("payment-confirmed");
  }, [memberSessions, paymentStep, paymentResult]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" showClose={!hideDialogClose}>
        {!paymentResult && user && !isProfileComplete && !bookingSessionIsTrialDropIn && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-2">
                <p className="font-medium">Profile Incomplete</p>
                <div className="text-sm">
                  <p>To book yoga sessions, please complete:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {getProfileIssues().map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={handleGoToProfile}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 !text-white"
                  data-testid="button-go-to-profile"
                >
                  <User className="w-4 h-4 mr-2" />
                  Complete Profile
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <DialogHeader>
          <DialogTitle className="text-primary font-bold">
            {paymentStep === "success"
              ? "You're booked!"
              : paymentStep === "guest-confirmed"
                ? "You're booked!"
              : paymentStep === "email-registered"
                ? "Sign in to book"
              : paymentStep === "payment-confirmed"
                ? "Payment confirmed"
                : paymentStep === "already-booked"
                  ? "Session already booked"
              : paymentResult
                ? "Complete Payment"
                : "Book Your Yoga Session"}
          </DialogTitle>
        </DialogHeader>

        {processingCopy && (
          <Alert className="border-amber-300 bg-amber-50">
            <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
            <AlertDescription className="text-amber-950">
              <p className="font-semibold">{processingCopy.title}</p>
              <p className="text-sm mt-1">{processingCopy.description}</p>
              <p className="text-xs mt-2 text-amber-800">{PAYMENT_PROCESSING_FOOTER}</p>
            </AlertDescription>
          </Alert>
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "guest-confirmed" && (
          <GuestBookingConfirmedContent
            onSignUp={handleGuestSignUp}
            onDecline={goToHomeCarousel}
            onCancel={goToHomeCarousel}
          />
        )}

        {paymentStep === "email-registered" && (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-950">
                This email is already registered with andWeYoga. Sign in to book this session.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              className="w-full bg-primary hover:bg-primary/90 !text-white font-bold"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              Sign in with Google
            </Button>
            <AuthHoverPopup>
              <Button type="button" variant="outline" className="w-full font-bold">
                Sign In / Sign Up
              </Button>
            </AuthHoverPopup>
          </div>
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "payment-confirmed" && paymentOutcome && (
          <PaymentConfirmedContent
            details={{
              bookingId: paymentOutcome.bookingId,
              className: paymentOutcome.className,
              instructorName: paymentOutcome.instructorName,
              sessionDate: paymentOutcome.sessionDate,
            }}
            onViewSessions={goToMySessionsUpcoming}
            onCancel={onClose}
          />
        )}

        {!paymentResult && user && paymentStep === "already-booked" && alreadyBookedView && (
          <AlreadyBookedSessionContent
            className={alreadyBookedView.className}
            instructorName={alreadyBookedView.instructorName}
            sessionDate={alreadyBookedView.sessionDate}
            onViewSessions={goToMySessionsUpcoming}
            onCancel={onClose}
          />
        )}

        {!paymentResult && paymentStep === "next-batch" && (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                This batch has already started, and we keep active sessions focused for members who
                joined on time. We would love to welcome you in the next upcoming slot.
              </AlertDescription>
            </Alert>
            {nextBatchPrompt ? (
              <div className="rounded-md border bg-muted p-3 text-sm">
                <p className="font-semibold text-primary">Next batch starts</p>
                <p className="text-muted-foreground">
                  {new Date(nextBatchPrompt.date).toLocaleDateString()} at{" "}
                  {new Date(nextBatchPrompt.date).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            ) : (
              !user && (
                <Input
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )
            )}
            <div className="flex gap-2">
              {nextBatchPrompt ? (
                <Button className="w-full" onClick={handleJoinNextBatch}>
                  Join the Batch
                </Button>
              ) : (
                <Button className="w-full" onClick={() => void handleWaitlistJoin()}>
                  Join Waitlist
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={onClose}>
                I'll join later
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={handleBrowseUpcomingFromSchedule}>
              Show upcoming options on schedule
            </Button>
          </div>
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "success" && paymentOutcome && (
          <div className="space-y-4">
            <Alert className="border-purple-200 bg-gradient-to-br from-purple-50 to-orange-50">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <p className="font-bold text-lg">See you on the mat</p>
                <p className="text-sm mt-1">
                  Payment received for {paymentOutcome.className}. Roll out your mat — your session is locked in.
                </p>
              </AlertDescription>
            </Alert>
            <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
              <p className="font-bold text-purple-600">{paymentOutcome.className}</p>
              <p className="text-muted-foreground">
                {new Date(paymentOutcome.sessionDate).toLocaleDateString()} at{" "}
                {new Date(paymentOutcome.sessionDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
              {paymentOutcome.instructorName && (
                <p className="text-muted-foreground">With {paymentOutcome.instructorName}</p>
              )}
              {paymentOutcome.googleMeetLink && (
                <Button asChild className="w-full bg-primary !text-white font-bold mt-2">
                  <a
                    href={paymentOutcome.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="booking-meet-link"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join session
                  </a>
                </Button>
              )}
              {(paymentOutcome.invoiceUrl || paymentOutcome.receiptUrl) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {paymentOutcome.invoiceUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={paymentOutcome.invoiceUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        Invoice
                      </a>
                    </Button>
                  )}
                  {paymentOutcome.receiptUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={paymentOutcome.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        Receipt
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              className="w-full font-bold"
              onClick={goToMySessionsUpcoming}
            >
              View My Sessions
            </Button>
          </div>
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "failed" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Payment did not complete. Your spot is reserved — please retry to confirm your session.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 !text-white font-bold"
              disabled={isPaying}
              onClick={() => {
                setPaymentStep("pay");
                if (paymentResult.useRazorpayCheckout) {
                  void startRazorpayCheckout(paymentResult);
                } else if (isValidPaymentUrl(paymentResult.razorpayLink)) {
                  openRazorpayPayment(paymentResult.razorpayLink);
                }
              }}
            >
              {isPaying ? "Opening Razorpay…" : "Retry payment"}
            </Button>
            <Button type="button" variant="outline" className="w-full font-bold" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "manual-submitted" && (
          <ManualPaymentSubmittedMessage
            isGuestCheckout={!!paymentResult.isGuestCheckout}
            onSignUp={handleGuestSignUp}
            onCancel={goToHomeCarousel}
            onViewSessions={goToMySessionsUpcoming}
          />
        )}

        {paymentResult && canAccessCheckoutUi && paymentStep === "pay" && !paymentOutcome && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CreditCard className="h-4 w-4 text-green-700" />
              <AlertDescription className="text-green-900">
                <p className="font-medium">Your spot is reserved</p>
                <p className="text-sm mt-1">
                  {paymentResult.useQrPayment
                    ? "Scan the QR code, pay the session fee, then enter the last 4 characters of your payment reference."
                    : isValidPaymentUrl(paymentResult.razorpayLink)
                      ? "Open the payment link, complete payment, then enter the last 4 characters of your payment reference or payment ID."
                    : paymentResult.useRazorpayCheckout
                      ? isPaying
                        ? "Follow the steps below. Do not close this page until payment is confirmed."
                        : `Pay now to confirm ${paymentResult.className}.`
                      : `Pay now via Razorpay to confirm ${paymentResult.className}.`}
                </p>
              </AlertDescription>
            </Alert>
            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              <p className="font-bold text-purple-600">{paymentResult.className}</p>
              <p className="text-muted-foreground">
                {new Date(paymentResult.sessionDate).toLocaleDateString()} at{" "}
                {new Date(paymentResult.sessionDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
              {paymentResult.instructorName && (
                <p className="text-muted-foreground">With {paymentResult.instructorName}</p>
              )}
              {formatSessionPrice(paymentResult.price) && (
                <p className="font-semibold text-primary">
                  Amount: {formatSessionPrice(paymentResult.price)}
                </p>
              )}
            </div>

            {paymentResult.useQrPayment && paymentResult.qrPayment && paymentResult.bookingId ? (
              <ManualPaymentReferenceBlock
                variant="qr"
                bookingId={paymentResult.bookingId}
                qrPayment={paymentResult.qrPayment}
                preferGuestCheckout={!!paymentResult.isGuestCheckout}
                onSubmitted={() => {
                  setPaymentStep("manual-submitted");
                  queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
                  toast({
                    title: "Reference submitted",
                    description: MANUAL_PAYMENT_SUBMITTED_TOAST,
                  });
                }}
              />
            ) : null}

            {!paymentResult.useQrPayment &&
            isValidPaymentUrl(paymentResult.razorpayLink) &&
            paymentResult.bookingId ? (
              <ManualPaymentReferenceBlock
                variant="payment_link"
                bookingId={paymentResult.bookingId}
                paymentLink={paymentResult.razorpayLink}
                preferGuestCheckout={!!paymentResult.isGuestCheckout}
                onSubmitted={() => {
                  setPaymentStep("manual-submitted");
                  queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
                  toast({
                    title: "Reference submitted",
                    description: MANUAL_PAYMENT_SUBMITTED_TOAST,
                  });
                }}
              />
            ) : null}

            {!paymentResult.useQrPayment &&
            !isValidPaymentUrl(paymentResult.razorpayLink) &&
            paymentResult.useRazorpayCheckout ? (
              <Button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 !text-white font-bold"
                disabled={isPaying || !!paymentPhase}
                onClick={() => void startRazorpayCheckout(paymentResult)}
                data-testid="booking-pay-razorpay"
              >
                {isPaying
                  ? paymentPhase === "verifying"
                    ? "Confirming payment…"
                    : "Payment in progress…"
                  : `Pay ${formatSessionPrice(paymentResult.price) ?? "now"}`}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full font-bold"
              onClick={onClose}
              disabled={isPaying || !!paymentPhase}
            >
              Cancel
            </Button>
          </div>
        )}

        {!paymentResult && !user && !isLoading && paymentStep !== "email-registered" && (
          <div className="text-center space-y-4">
            {guestPreselectedLoading ? (
              <div className="space-y-3 text-left" data-testid="guest-booking-loading">
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ) : canGuestBook && hasPreselectedSession && displayClass && preselectedIsBookable ? (
              <div className="space-y-3 text-left">
                <div className="text-left p-3 bg-muted rounded-md">
                  <p className="text-sm font-bold text-purple-600">{displayClass.classType.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(displayClass.date).toLocaleDateString()} at{" "}
                    {new Date(displayClass.date).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-900">
                    Guest booking is enabled for this {guestEligibleSession?.sessionFrequency === "trial" ? "trial" : "drop-in"} session.
                  </AlertDescription>
                </Alert>
                {guestFormBanner ? (
                  <Alert variant="destructive" data-testid="guest-form-error-banner">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{guestFormBanner}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="space-y-2">
                  <Label>
                    Name <span className="text-dz-secondary">*</span>
                  </Label>
                  <Input
                    value={guestBooking.name}
                    maxLength={MAX_TEXT_LENGTH.guestName}
                    onChange={(e) =>
                      updateGuestField(
                        "name",
                        limitTextInput(e.target.value, MAX_TEXT_LENGTH.guestName),
                      )
                    }
                    onBlur={() => handleGuestFieldBlur("name")}
                    placeholder="Your name"
                    aria-invalid={!!guestFieldErrors.name}
                    className={cn(guestFieldErrors.name && "border-destructive focus-visible:ring-destructive")}
                    data-testid="guest-name-input"
                  />
                  {guestFieldErrors.name ? (
                    <p className="text-xs text-destructive" data-testid="guest-name-error">
                      {guestFieldErrors.name}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>
                    Email <span className="text-dz-secondary">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={guestBooking.email}
                    maxLength={MAX_TEXT_LENGTH.guestEmail}
                    onChange={(e) =>
                      updateGuestField(
                        "email",
                        limitTextInput(e.target.value, MAX_TEXT_LENGTH.guestEmail),
                      )
                    }
                    onBlur={() => handleGuestFieldBlur("email")}
                    placeholder="you@example.com"
                    aria-invalid={!!guestFieldErrors.email}
                    className={cn(guestFieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                    data-testid="guest-email-input"
                  />
                  {guestFieldErrors.email ? (
                    <p className="text-xs text-destructive" data-testid="guest-email-error">
                      {guestFieldErrors.email}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>
                    Phone <span className="text-dz-secondary">*</span>
                  </Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    required
                    value={guestBooking.phone}
                    onChange={(e) => updateGuestField("phone", sanitizeGuestPhoneInput(e.target.value))}
                    onBlur={() => handleGuestFieldBlur("phone")}
                    placeholder="9876543210"
                    aria-invalid={!!guestFieldErrors.phone}
                    className={cn(guestFieldErrors.phone && "border-destructive focus-visible:ring-destructive")}
                    data-testid="guest-phone-input"
                  />
                  {guestFieldErrors.phone ? (
                    <p className="text-xs text-destructive" data-testid="guest-phone-error">
                      {guestFieldErrors.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">10-digit mobile number required.</p>
                  )}
                </div>
                <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary">{guestCopy.guestConsentHeading}</p>
                    <div className="flex rounded-md border border-dz-glass-border bg-white/80 p-0.5 text-[10px] font-semibold">
                      {(["en", "kn"] as const).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setConsentLang(code)}
                          className={cn(
                            "rounded px-2 py-0.5",
                            consentLang === code ? "bg-primary text-white" : "text-dz-muted",
                          )}
                        >
                          {code === "en" ? "EN" : "ಕನ್ನಡ"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ConsentCheckbox
                    checked={guestConsent.profile}
                    onChange={(v) => setGuestConsent((g) => ({ ...g, profile: v }))}
                    testId="guest-consent-profile"
                    label={guestCopy.cb1Profile}
                    className="border-0 bg-transparent p-0"
                  />
                  <ConsentCheckbox
                    checked={guestConsent.terms}
                    onChange={(v) => setGuestConsent((g) => ({ ...g, terms: v }))}
                    testId="guest-consent-terms"
                    className="border-0 bg-transparent p-0"
                    label={
                      <>
                        {guestCopy.cb2TermsPrefix}{" "}
                        <Link href="/terms" target="_blank" className="text-primary underline">
                          {guestCopy.cb2TermsLink}
                        </Link>{" "}
                        {guestCopy.cb2And}{" "}
                        <Link href="/privacy" target="_blank" className="text-primary underline">
                          {guestCopy.cb2PrivacyLink}
                        </Link>
                        .
                      </>
                    }
                  />
                  <ConsentCheckbox
                    checked={guestConsent.age}
                    onChange={(v) => setGuestConsent((g) => ({ ...g, age: v }))}
                    testId="guest-consent-age"
                    label={guestCopy.cb3Age}
                    className="border-0 bg-transparent p-0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="w-full bg-primary !text-white"
                    onClick={handleSubmit}
                    disabled={
                      !guestConsent.terms ||
                      !guestConsent.age ||
                      guestBooking.phone.length !== 10 ||
                      bookingMutation.isPending ||
                      isPaying
                    }
                  >
                    {bookingMutation.isPending ? "Reserving…" : "Continue to payment"}
                  </Button>
                  <AuthHoverPopup>
                    <Button variant="outline" className="w-full">
                      Sign In / Sign Up
                    </Button>
                  </AuthHoverPopup>
                </div>
              </div>
            ) : canGuestBook && hasPreselectedSession && displayClass && !preselectedIsBookable ? (
              <Alert className="border-amber-200 bg-amber-50 text-left">
                <AlertDescription className="text-amber-950 text-sm">
                  {isTrialOrDropIn(displayClass.sessionFrequency)
                    ? TRIAL_DROPIN_MIDSESSION_MESSAGE
                    : "This session is no longer open for booking. Please pick another time from the schedule."}
                </AlertDescription>
              </Alert>
            ) : hasPreselectedSession && displayClass && !canGuestBook ? (
              <>
                <div className="text-left p-3 bg-muted rounded-md">
                  <p className="text-sm font-bold text-purple-600">{displayClass.classType.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(displayClass.date).toLocaleDateString()} at{" "}
                    {new Date(displayClass.date).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <p className="text-purple-600 font-medium">
                  Sign in to book this session, or choose a trial or drop-in from the schedule below.
                </p>
                <AuthHoverPopup onContinueAsGuest={() => onClose()}>
                  <Button
                    className="bg-primary !text-white font-bold hover:bg-primary/90 w-full"
                    data-testid="show-auth-hover"
                  >
                    Sign In / Sign Up
                  </Button>
                </AuthHoverPopup>
                <Button type="button" variant="outline" className="w-full" onClick={onClose}>
                  View schedule
                </Button>
              </>
            ) : (
              <>
                {hasClassTypeFilter && (
                  <p className="text-sm text-purple-600 font-medium">
                    {filteredClassType
                      ? `Sign in to book ${filteredClassType.name}`
                      : "Sign in to book this class type"}
                  </p>
                )}
                <p className="text-purple-600 font-medium">
                  {hasClassTypeFilter
                    ? "Sign in to book this class type, or pick a trial or drop-in session from the schedule."
                    : "Choose a trial or drop-in session from the schedule below, or sign in to book recurring classes."}
                </p>
                <AuthHoverPopup onContinueAsGuest={() => onClose()}>
                  <Button
                    className="bg-primary !text-white font-bold hover:bg-primary/90 w-full"
                    data-testid="show-auth-hover"
                  >
                    Sign In / Sign Up
                  </Button>
                </AuthHoverPopup>
                <Button type="button" variant="outline" className="w-full" onClick={onClose}>
                  View schedule
                </Button>
              </>
            )}
          </div>
        )}

        {!paymentResult && user && paymentStep !== "already-booked" && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-purple-600 font-bold">Booking for: {user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {hasPreselectedSession ? (
                <div>
                  <Label className="text-sm font-bold text-purple-600">Selected Class</Label>
                  {selectedClassLoading && !displayClass ? (
                    <div className="mt-1 p-3 bg-muted rounded-md space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ) : displayClass && preselectedIsBookable ? (
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="font-bold text-purple-600" data-testid="selected-class-name">
                        {displayClass.classType.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="selected-class-details">
                        {new Date(displayClass.date).toLocaleDateString()} at{" "}
                        {new Date(displayClass.date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        With {displayClass.instructor.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {displayClass.currentBookings}/{displayClass.maxCapacity} spots filled
                      </p>
                    </div>
                  ) : displayClass ? (
                    <Alert className="mt-2 border-amber-200 bg-amber-50">
                      <AlertDescription className="text-sm text-amber-950">
                        {displayClass.currentBookings >= displayClass.maxCapacity
                          ? "This session is full. Please choose another time from the schedule."
                          : isTrialOrDropIn(displayClass.sessionFrequency)
                            ? TRIAL_DROPIN_MIDSESSION_MESSAGE
                            : "This session has already ended. Please pick another time from the schedule."}
                      </AlertDescription>
                    </Alert>
                  ) : selectedClassLoading ? (
                    <p className="text-sm text-muted-foreground mt-1">Loading session…</p>
                  ) : (
                    <p className="text-sm text-destructive mt-1">
                      {selectedClassError
                        ? "This session is not available to book yet (check it is published and the instructor is active)."
                        : "Could not load this session. Please close and pick another time from the schedule."}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {hasClassTypeFilter && filteredClassType && (
                    <p className="text-sm text-purple-600 font-medium mb-2">
                      Upcoming sessions for {filteredClassType.name}
                    </p>
                  )}
                  <Label htmlFor="classId" className="text-sm font-bold text-purple-600">
                    {hasClassTypeFilter ? "Select session *" : "Select Class *"}
                  </Label>
                  {showSessionPicker && (
                    <>
                      {allClasses === undefined ? (
                        <div className="mt-1 space-y-2">
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : getAvailableClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-2">
                          {hasClassTypeFilter
                            ? "No upcoming sessions with spots for this class. Try the week schedule or another class."
                            : "No classes with available spots right now."}
                        </p>
                      ) : (
                        <Select
                          value={formData.classId || undefined}
                          onValueChange={(value) => {
                            setFormData({ classId: value });
                            showAlreadyBookedForClass(value);
                          }}
                        >
                          <SelectTrigger className="mt-1" data-testid="booking-class-select">
                            <SelectValue placeholder="Choose a class" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableClasses.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {formatClassOption(cls)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedSession && selectedPriceLabel && (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <p className="text-sm font-bold text-purple-600">Session fee: {selectedPriceLabel}</p>
                  {(selectedSession as { paymentMethod?: string }).paymentMethod === "qr" ? (
                    <p className="text-xs text-muted-foreground">
                      After you reserve, scan the QR code and submit your payment reference for verification.
                    </p>
                  ) : selectedPaymentLink || (selectedSession as { hasPaymentConfigured?: boolean }).hasPaymentConfigured ? (
                    <p className="text-xs text-muted-foreground">
                      After you reserve, you will complete payment in the next step (Razorpay).
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800">
                      Payment is not configured for this session. Please choose another time.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 font-bold"
                  data-testid="booking-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary !text-white font-bold hover:bg-primary/90"
                  disabled={
                    bookingMutation.isPending ||
                    isPaying ||
                    (hasPreselectedSession && (!preselectedIsBookable || !(formData.classId || sessionId))) ||
                    (showSessionPicker &&
                      getAvailableClasses.length > 0 &&
                      !formData.classId &&
                      !sessionId)
                  }
                  data-testid="booking-confirm"
                >
                  {bookingMutation.isPending
                    ? "Reserving..."
                    : selectedPaymentLink
                      ? "Reserve & Pay"
                      : "Book Session"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function toSessionDateString(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}
