import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  Camera,
  ChevronDown,
  ChevronRight,
  Heart,
  ImagePlus,
  PlayCircle,
  RefreshCw,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  deleteFuelMeal,
  estimateFuelMeal,
  fetchFuelDashboard,
  fetchFuelStatement,
  FuelEstimateRequestError,
  logFuelMeal,
  type FuelDashboardResponse,
  type FuelStatementResponse,
} from "@/lib/fuel-api";
import {
  dayStatus,
  formatSignedDelta,
  FUEL_ESTIMATE_FAILURE_COPY,
  FUEL_ESTIMATE_LOW_COPY,
  FUEL_ESTIMATE_NO_FOOD_COPY,
  FUEL_ESTIMATE_PHOTO_FORMATS_COPY,
  FUEL_ESTIMATE_PHOTO_HEIC_COPY,
  FUEL_ESTIMATE_SUCCESS_COPY,
  FUEL_ESTIMATE_TRANSIENT_COPY,
  fuelEstimatePhotoFileError,
  FUEL_MEDICAL_DISCLAIMER,
  FUEL_SUPPORT_COPY,
  FUEL_SUPPORT_HREF,
  signedDelta,
  type DayVerdictStatus,
  type FuelEstimateReviewState,
} from "@shared/fuel";

type FuelView = "fuel" | "statement";

type StatementDayVerdict = DayVerdictStatus; // on_track | over | under | pending

function statusPillClass(status: string) {
  if (status === "on_track") return "bg-[#cfe9d1] text-[#354c3a]";
  if (status === "pending") return "bg-muted text-muted-foreground";
  return "bg-red-100 text-[#ba1a1a]";
}

/** Color fill for statement day trays outside the target band. */
function statementDayTrayClass(status: StatementDayVerdict) {
  if (status === "over" || status === "under") {
    return "bg-red-50 border-red-100";
  }
  if (status === "on_track") {
    return "bg-[#f3faf4] border-emerald-100/80";
  }
  return "";
}

function statementDayHeaderTextClass(status: StatementDayVerdict) {
  if (status === "over" || status === "under") return "text-[#9f1239]";
  if (status === "on_track") return "text-[#354c3a]";
  return "text-primary";
}

function statementDayVerdictLabel(status: StatementDayVerdict): string {
  if (status === "on_track") return "Target Hit";
  if (status === "over") return "Target missed — Over eating";
  if (status === "under") return "Target missed — Under eating";
  return "In progress";
}

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

function formatStatementDate(date: string): { ddmm: string; weekday: string } {
  const [y, m, d] = date.split("-");
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  return { ddmm: `${d}/${m}`, weekday };
}

type StatementDayTray = {
  date: string;
  meals: FuelStatementResponse["rows"];
  dayTotal: number;
  target: number;
  status: StatementDayVerdict;
  delta: number | null;
};

function buildStatementDayTrays(data: FuelStatementResponse): StatementDayTray[] {
  const byDate = new Map<string, FuelStatementResponse["rows"]>();
  for (const row of data.rows) {
    const list = byDate.get(row.loggedDate) ?? [];
    list.push(row);
    byDate.set(row.loggedDate, list);
  }

  return weekDateKeys(data.today)
    .filter((date) => date <= data.today)
    .map((date) => {
      const meals = (byDate.get(date) ?? []).slice().sort((a, b) => {
        const ta = a.clientLocalTime || "";
        const tb = b.clientLocalTime || "";
        return ta.localeCompare(tb);
      });
      const dayTotal = meals.reduce((s, m) => s + m.calories, 0);
      const targetFromMeal = meals.find((m) => m.targetAtLogCal > 0)?.targetAtLogCal;
      const target = targetFromMeal || data.target;

      let status: StatementDayVerdict;
      if (date === data.today && meals.length === 0) {
        status = "pending";
      } else if (date === data.today && meals.some((m) => m.dayStatus === "pending")) {
        status = "pending";
      } else if (meals.length === 0) {
        // Past day with nothing logged → under eating / target missed
        status = "under";
      } else {
        status = dayStatus(dayTotal, target, data.deficit);
      }

      const delta = status === "pending" ? null : signedDelta(dayTotal, target);
      return { date, meals, dayTotal, target, status, delta };
    })
    .reverse(); // newest first
}

function LogMealModal({
  open,
  onClose,
  mealPlan,
  dayTotal,
  target,
  estimationAvailable,
}: {
  open: boolean;
  onClose: () => void;
  mealPlan: Array<{ index: number; label: string }>;
  dayTotal: number;
  target: number;
  estimationAvailable: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [step, setStep] = useState<"upload" | "camera" | "scanning" | "result" | "error">("upload");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [slotIndex, setSlotIndex] = useState<number | "">("");
  const [reviewState, setReviewState] = useState<FuelEstimateReviewState | "manual" | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const clearPhotoPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPhotoPreviewUrl(null);
  };

  const setPhotoFile = (file: File | null) => {
    clearPhotoPreview();
    setLastFile(file);
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPhotoPreviewUrl(url);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const resetModalState = () => {
    stopCamera();
    clearPhotoPreview();
    setStep("upload");
    setName("");
    setCalories("");
    setSlotIndex("");
    setReviewState(null);
    setRetryCount(0);
    setLastFile(null);
    setErrorMessage("");
    setErrorCode(null);
    setDragOver(false);
    setCameraStarting(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) {
      resetModalState();
      return;
    }
    if (!estimationAvailable) {
      setStep("result");
      setReviewState("manual");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when open/availability flips
  }, [open, estimationAvailable]);

  useEffect(() => () => {
    stopCamera();
    clearPhotoPreview();
  }, []);

  // Bind stream only after the camera step mounts <video> (fixes black preview on desktop).
  useEffect(() => {
    if (step !== "camera") return;

    let cancelled = false;
    let poll: number | undefined;
    let timeout: number | undefined;
    let raf = 0;

    const cleanupVideoHandlers = (video: HTMLVideoElement) => {
      video.onloadedmetadata = null;
      video.onplaying = null;
    };

    const bind = () => {
      const stream = streamRef.current;
      const video = videoRef.current;
      if (!stream || !video || cancelled) return false;

      const markReady = () => {
        if (!cancelled && video.videoWidth > 0) setCameraReady(true);
      };

      video.srcObject = stream;
      video.onloadedmetadata = markReady;
      video.onplaying = markReady;
      void video.play().then(markReady).catch(() => undefined);

      poll = window.setInterval(() => {
        if (cancelled) return;
        if (video.videoWidth > 0) {
          setCameraReady(true);
          if (poll != null) window.clearInterval(poll);
        }
      }, 100);
      timeout = window.setTimeout(() => {
        if (poll != null) window.clearInterval(poll);
      }, 8000);

      return true;
    };

    if (!bind()) {
      raf = requestAnimationFrame(() => {
        if (!bind() && !cancelled) {
          toast({
            title: "Camera preview failed",
            description: "Cancel and try Take photo again, or use Choose from library.",
            variant: "destructive",
          });
        }
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (poll != null) window.clearInterval(poll);
      if (timeout != null) window.clearTimeout(timeout);
      if (videoRef.current) cleanupVideoHandlers(videoRef.current);
    };
  }, [step, toast]);

  const saveMutation = useMutation({
    mutationFn: () =>
      logFuelMeal({
        name: name.trim(),
        calories: Number(calories),
        mealSlotIndex: slotIndex === "" ? undefined : Number(slotIndex),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
      toast({ title: "Added to Calorie Bank" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const applyEstimate = (est: Awaited<ReturnType<typeof estimateFuelMeal>>) => {
    setName(est.name || "");
    setCalories(est.calories ? String(est.calories) : "");
    setReviewState(est.reviewState);
    setStep("result");
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    const fileError = fuelEstimatePhotoFileError(file);
    if (fileError) {
      setPhotoFile(null);
      setErrorMessage(fileError);
      setErrorCode("unreadable");
      setStep("error");
      return;
    }
    setPhotoFile(file);
    setStep("scanning");
    setErrorMessage("");
    setErrorCode(null);
    try {
      const est = await estimateFuelMeal(file, {
        slotIndex: slotIndex === "" ? undefined : Number(slotIndex),
      });
      applyEstimate(est);
    } catch (err) {
      if (err instanceof FuelEstimateRequestError && err.status === 501) {
        setReviewState("manual");
        setStep("result");
        return;
      }
      if (err instanceof FuelEstimateRequestError) {
        setErrorCode(err.body.error);
        setErrorMessage(
          err.body.error === "no_food"
            ? err.message || FUEL_ESTIMATE_NO_FOOD_COPY
            : err.message,
        );
      } else {
        setErrorCode("provider_down");
        setErrorMessage(err instanceof Error ? err.message : FUEL_ESTIMATE_TRANSIENT_COPY);
      }
      setStep("error");
    }
  };

  const openLibraryPicker = () => libraryInputRef.current?.click();

  const openCameraFallback = () => cameraInputRef.current?.click();

  const startLiveCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Live camera unavailable",
        description: "Opening the system camera picker instead.",
      });
      openCameraFallback();
      return;
    }
    setCameraStarting(true);
    setCameraReady(false);
    try {
      stopCamera();
      // Prefer rear camera on phones; plain video:true is more reliable on desktop Macs.
      const isCoarsePointer =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isCoarsePointer
            ? { facingMode: { ideal: "environment" } }
            : true,
          audio: false,
        });
      } catch (firstErr) {
        // Retry once with the simplest constraint set.
        if (!isCoarsePointer) throw firstErr;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setStep("camera");
    } catch (err) {
      stopCamera();
      setStep("upload");
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      toast({
        title: denied ? "Camera permission blocked" : "Could not start camera",
        description: denied
          ? "Allow camera access for this site, then try Take photo again."
          : "Try Choose from library, or allow camera access and retry.",
        variant: "destructive",
      });
    } finally {
      setCameraStarting(false);
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast({
        title: "Camera not ready",
        description: "Wait until the live preview appears, then tap Capture.",
        variant: "destructive",
      });
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast({
        title: "Capture failed",
        description: "Try again, or choose a photo from your library.",
        variant: "destructive",
      });
      return;
    }
    ctx.drawImage(video, 0, 0);
    stopCamera();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      toast({
        title: "Capture failed",
        description: "Try again, or choose a photo from your library.",
        variant: "destructive",
      });
      setStep("upload");
      return;
    }
    const file = new File([blob], `meal-${Date.now()}.jpg`, { type: "image/jpeg" });
    void onPickPhoto(file);
  };

  const retryPhoto = () => {
    if (retryCount >= 1) {
      setReviewState("manual");
      setStep("result");
      setName("");
      setCalories("");
      return;
    }
    setRetryCount((c) => c + 1);
    if (lastFile) {
      void onPickPhoto(lastFile);
    } else {
      setStep("upload");
    }
  };

  const goToUploadChooser = () => {
    stopCamera();
    clearPhotoPreview();
    setLastFile(null);
    setName("");
    setCalories("");
    setReviewState(null);
    setRetryCount(0);
    setErrorMessage("");
    setErrorCode(null);
    setStep("upload");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  };

  const retakeWithCamera = () => {
    stopCamera();
    clearPhotoPreview();
    setLastFile(null);
    setName("");
    setCalories("");
    setReviewState(null);
    setRetryCount(0);
    setErrorMessage("");
    setErrorCode(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
    void startLiveCamera();
  };

  if (!open) return null;

  const calNum = Number(calories);
  const previewTotal = dayTotal + (Number.isFinite(calNum) ? calNum : 0);
  const canSave = name.trim().length > 0 && Number.isFinite(calNum) && calNum >= 0;

  const advisoryCopy =
    reviewState === "success"
      ? FUEL_ESTIMATE_SUCCESS_COPY
      : reviewState === "low"
        ? FUEL_ESTIMATE_LOW_COPY
        : reviewState === "failure"
          ? FUEL_ESTIMATE_FAILURE_COPY
          : null;

  const advisoryClass =
    reviewState === "success"
      ? "border-[#cfe9d1] bg-[#cfe9d1]/40 text-[#354c3a]"
      : reviewState === "low"
        ? "border-[#f0d4b8] bg-[#fdf4eb] text-[#7a3a10]"
        : "text-muted-foreground";

  const photoThumb = (heightClass = "h-[90px]") =>
    photoPreviewUrl ? (
      <img
        src={photoPreviewUrl}
        alt="Selected meal"
        className={cn("mt-4 w-full rounded-xl object-cover", heightClass)}
      />
    ) : (
      <div
        className={cn(
          "mt-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary",
          heightClass,
        )}
      >
        <Utensils className="h-8 w-8" />
      </div>
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="fuel-log-modal"
    >
      <div
        className="relative w-full max-w-[400px] rounded-[22px] bg-dz-surface p-6 shadow-[0_24px_60px_rgba(27,28,27,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-primary/5"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {step === "upload" && estimationAvailable && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Log a meal</h3>
            <div
              role="button"
              tabIndex={0}
              onClick={openLibraryPicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLibraryPicker();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onPickPhoto(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "mt-4 flex h-[150px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-primary/[0.03] text-sm text-muted-foreground",
                dragOver ? "border-primary bg-primary/[0.08]" : "border-primary/25",
              )}
            >
              <ImagePlus className="h-8 w-8 text-primary/70" />
              Drag a photo here, or choose from your library
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {FUEL_ESTIMATE_PHOTO_FORMATS_COPY}
              <br />
              {FUEL_ESTIMATE_PHOTO_HEIC_COPY}
            </p>
            <Button
              className="mt-4 w-full"
              disabled={cameraStarting}
              onClick={() => void startLiveCamera()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {cameraStarting ? "Starting camera…" : "Take photo"}
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={openLibraryPicker}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Choose from library
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                clearPhotoPreview();
                setLastFile(null);
                setReviewState("manual");
                setStep("result");
              }}
            >
              Skip, enter manually
            </Button>
          </>
        )}

        {step === "camera" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Take a photo</h3>
            <div className="relative mt-4 overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="aspect-[4/3] w-full object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4 text-center text-sm text-white">
                  Starting camera…
                </div>
              )}
            </div>
            <Button
              className="mt-4 w-full"
              disabled={!cameraReady}
              onClick={() => void captureFromCamera()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {cameraReady ? "Capture" : "Waiting for camera…"}
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                stopCamera();
                setStep("upload");
              }}
            >
              Cancel
            </Button>
          </>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <h3 className="font-display text-xl font-bold text-primary">Scanning your plate</h3>
            {photoThumb("h-[140px]")}
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-dashed border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Detecting food and estimating calories…</p>
          </div>
        )}

        {step === "error" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">
              {errorCode === "no_food" ? "No food detected" : "Could not estimate"}
            </h3>
            {photoThumb()}
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage ||
                (errorCode === "no_food" ? FUEL_ESTIMATE_NO_FOOD_COPY : FUEL_ESTIMATE_TRANSIENT_COPY)}
            </p>
            {errorCode === "no_food" ? (
              <Button className="mt-4 w-full" onClick={retakeWithCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Retake photo
              </Button>
            ) : (
              <Button className="mt-4 w-full" onClick={retryPhoto}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try photo again
              </Button>
            )}
            {errorCode !== "no_food" && (
              <Button variant="secondary" className="mt-2 w-full" onClick={goToUploadChooser}>
                Choose another photo
              </Button>
            )}
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                setReviewState("manual");
                setStep("result");
                setName("");
                setCalories("");
              }}
            >
              Enter manually
            </Button>
          </>
        )}

        {step === "result" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Confirm your meal</h3>
            {photoThumb()}
            {advisoryCopy && (
              <p
                className={cn(
                  "mt-3 rounded-lg border px-3 py-2 text-xs font-medium",
                  advisoryClass,
                )}
              >
                {advisoryCopy}
              </p>
            )}
            {reviewState === "manual" && !photoPreviewUrl && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                Manual entry — nothing was estimated.
              </p>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Meal
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Calories
                </label>
                <Input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                />
              </div>
              {mealPlan.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Meal slot (optional)
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={slotIndex}
                    onChange={(e) =>
                      setSlotIndex(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="">Auto / none</option>
                    {mealPlan.map((s) => (
                      <option key={s.index} value={s.index}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Target {target} · today so far {previewTotal} cal
            </p>
            <Button
              className="mt-4 w-full"
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Add to Calorie Bank
            </Button>
            {estimationAvailable && (
              <Button variant="secondary" className="mt-2 w-full" onClick={retakeWithCamera}>
                Retake photo
              </Button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function DailyInspirationCards({
  recipe,
  practiceAlong,
}: {
  recipe: FuelDashboardResponse["recipe"];
  practiceAlong: FuelDashboardResponse["practiceAlong"];
}) {
  const [recipeOpen, setRecipeOpen] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <GlassCard className="overflow-hidden p-0">
        {recipe?.imageUrl ? (
          <img src={recipe.imageUrl} alt="" className="h-[190px] w-full object-cover" />
        ) : (
          <div className="flex h-[190px] items-center justify-center bg-primary/5 text-primary/40">
            <Apple className="h-10 w-10" />
          </div>
        )}
        <div className="p-5">
          <span className="inline-flex rounded-lg bg-[#cfe9d1] px-2.5 py-1 text-xs font-semibold text-[#354c3a]">
            Recipe of the day
          </span>
          {recipe ? (
            <>
              <h3 className="mt-3 font-display text-xl font-bold text-primary">{recipe.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{recipe.teaser}</p>
              {recipeOpen && (
                <div className="mt-3 space-y-2 border-t border-dashed border-primary/15 pt-3 text-sm">
                  <p className="whitespace-pre-wrap">{recipe.ingredients}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{recipe.method}</p>
                </div>
              )}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                onClick={() => setRecipeOpen((v) => !v)}
              >
                {recipeOpen ? "Show less" : "Read more"}
                {recipeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No recipe set for today yet.</p>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-primary">Practice along</h3>
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            YouTube / Instagram
          </span>
        </div>
        {practiceAlong ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black/5">
            <iframe
              title={practiceAlong.title}
              src={practiceAlong.embedUrl}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-4 flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-primary/[0.04] text-muted-foreground">
            <PlayCircle className="h-12 w-12 text-primary/35" />
            <p className="text-sm">No practice video set for today.</p>
          </div>
        )}
        {practiceAlong?.title ? (
          <p className="mt-3 text-sm font-medium text-primary">{practiceAlong.title}</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

function FuelDashboardView({
  data,
  onOpenLog,
}: {
  data: Extract<FuelDashboardResponse, { gate: "ok" }>;
  onOpenLog: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pepIndex, setPepIndex] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const pep = data.pepPhrases[pepIndex % data.pepPhrases.length];

  const deleteMutation = useMutation({
    mutationFn: deleteFuelMeal,
    onSuccess: async () => {
      setConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const todayMeals = data.meals.filter((m) => m.loggedDate === data.today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
            Your daily <span className="font-accent italic font-normal text-dz-secondary">diet</span>
          </h1>
          <p className="mt-2 inline-flex rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Target: {data.target} cal/day · band −{data.deficit}
          </p>
        </div>
        <Button
          className="h-9 shrink-0 px-3.5 text-sm sm:h-10 sm:px-4"
          onClick={onOpenLog}
          data-testid="fuel-log-meal"
        >
          <Camera className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          Track your Diet
        </Button>
      </div>

      <GlassCard className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
        <p className="mt-2 font-mono text-[26px] font-semibold text-primary">
          {data.dayTotal} / {data.target} cal
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{data.caloriesLeftLabel}</p>
        {data.verdictReady && data.status !== "pending" && (
          <span className={cn("mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", statusPillClass(data.status))}>
            {data.statusDelta} · {data.status.replace("_", " ")}
          </span>
        )}
      </GlassCard>

      <div>
        <h3 className="font-display text-[19px] font-bold text-primary">Today&apos;s meals</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Entries for today against your target band (−{data.deficit} cal).
        </p>
        <div className="mt-4 space-y-2">
          {todayMeals.length === 0 && (
            <GlassCard className="p-5 text-sm text-muted-foreground">No meals logged today yet.</GlassCard>
          )}
          {todayMeals.map((row) =>
            confirmId === row.id ? (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-[#ba1a1a]"
              >
                <span>Delete “{row.name}”?</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <GlassCard key={row.id} className="flex items-center gap-3 px-3 py-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Utensils className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary">{row.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.clientLocalTime || "-"}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-primary">{row.calories}</p>
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-[#ba1a1a]"
                  onClick={() => setConfirmId(row.id)}
                  aria-label="Delete meal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </GlassCard>
            ),
          )}
        </div>
      </div>

      <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />

      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4b3282] to-dz-secondary px-7 py-7 text-white">
        <Heart className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 rotate-12 text-white/10" />
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Vibe check</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <p className="max-w-3xl font-display text-[clamp(18px,2.2vw,24px)] font-semibold leading-snug">
            {pep?.pre}
            <span className="font-accent italic font-normal">{pep?.accent}</span>
            {pep?.post}
          </p>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            onClick={() => setPepIndex((i) => i + 1)}
            aria-label="Shuffle vibe"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatementView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fuel-statement"],
    queryFn: fetchFuelStatement,
  });
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const dayTrays = useMemo(() => (data ? buildStatementDayTrays(data) : []), [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading statement…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load statement"}
      </p>
    );
  }

  const floor = Math.max(0, data.target - data.deficit);

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-muted-foreground">My Account &gt; Calorie Bank &amp; Statement</p>
      <h1 className="font-display text-[clamp(28px,4vw,42px)] font-bold tracking-tight text-primary">
        Your calorie <span className="font-accent italic font-normal text-dz-secondary">statement</span>
      </h1>
      <p className="inline-flex flex-wrap rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
        Target set: {data.target} cal/day · maintain {floor}–{data.target} (band −{data.deficit})
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Target Hit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Target missed — over / under eating
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/30" /> In progress
        </span>
        <span className="rounded-lg bg-[#f4f1f8] px-2.5 py-1 font-semibold text-primary">This week</span>
      </div>

      <div className="space-y-3">
        {dayTrays.map((day) => {
          const { ddmm, weekday } = formatStatementDate(day.date);
          const expanded = openDays[day.date] ?? day.date === data.today;
          const headerTone = statementDayHeaderTextClass(day.status);
          return (
            <GlassCard
              key={day.date}
              className={cn("overflow-hidden p-0", statementDayTrayClass(day.status))}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                onClick={() =>
                  setOpenDays((prev) => ({
                    ...prev,
                    [day.date]: !expanded,
                  }))
                }
                aria-expanded={expanded}
              >
                <span className="mt-0.5 text-muted-foreground">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={cn("font-mono text-sm font-semibold", headerTone)}>
                      {ddmm} <span className="font-sans font-medium">{weekday}</span>
                    </p>
                    <span className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", statusPillClass(day.status))}>
                      {statementDayVerdictLabel(day.status)}
                    </span>
                  </div>
                  <p className={cn("font-mono text-xs", day.status === "over" || day.status === "under" ? "text-[#9f1239]/80" : "text-muted-foreground")}>
                    Target set {day.target}
                    {" · "}
                    Consumed {day.dayTotal}
                    {day.delta != null ? ` · vs target ${formatSignedDelta(day.delta)}` : ""}
                  </p>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-black/5 px-4 py-3">
                  {day.meals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {day.status === "pending" ? "No meals logged yet today." : "No meals logged this day."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {day.meals.map((meal) => (
                        <li
                          key={meal.id}
                          className="flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2.5"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Utensils className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary">{meal.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {meal.clientLocalTime || "—"}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-semibold text-primary">{meal.calories}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {data.mealsLoggedThisWeek} meals logged this week
        {data.avgDailyDelta != null
          ? ` · avg daily vs target ${data.avgDailyDelta > 0 ? "+" : ""}${data.avgDailyDelta} cal`
          : ""}
      </p>

      <p className="text-xs text-muted-foreground">{FUEL_MEDICAL_DISCLAIMER}</p>
      <a href={FUEL_SUPPORT_HREF} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
        {FUEL_SUPPORT_COPY}
      </a>
    </div>
  );
}

export default function FuelPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<FuelView>("fuel");
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fuel-dashboard"],
    queryFn: fetchFuelDashboard,
    enabled: Boolean(user),
    refetchOnMount: "always",
    staleTime: 0,
  });

  return (
    <DashboardShell active="fuel">
      <PageContainer className="relative py-[clamp(24px,4vw,40px)] pb-24">
        <div className="mb-6 inline-flex rounded-full bg-primary/5 p-1">
          {(
            [
              ["fuel", "Diet Control"],
              ["statement", "Calorie Statement"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                view === id ? "bg-primary text-white" : "text-muted-foreground hover:text-primary",
              )}
              data-testid={`fuel-view-${id}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading andWeFuel…</p>}
        {error && (
          <GlassCard className="p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
            <Button className="mt-3" variant="secondary" onClick={() => void refetch()}>
              Retry
            </Button>
          </GlassCard>
        )}

        {data?.gate === "health_consent_required" && (
          <div className="space-y-6">
            <GlassCard className="space-y-3 p-6">
              <h2 className="font-display text-2xl font-bold text-primary">Health data consent needed</h2>
              <p className="text-sm text-muted-foreground">
                andWeFuel uses your health-data consent to store meal names and calorie values. Photos are
                never kept. Only the confirmed name and calories.
              </p>
              <p className="text-xs text-muted-foreground">{FUEL_MEDICAL_DISCLAIMER}</p>
              <Button onClick={() => setLocation("/my-account#privacy")}>
                Review privacy & consent
              </Button>
            </GlassCard>
            <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />
          </div>
        )}

        {data?.gate === "not_configured" && (
          <div className="space-y-6">
            <GlassCard className="space-y-3 p-6">
              <h2 className="font-display text-2xl font-bold text-primary">Almost ready</h2>
              <p className="text-sm text-muted-foreground">{data.message}</p>
              <p className="text-sm text-muted-foreground">
                Your coach will set a daily target, deficit band, and meal schedule before logging opens.
              </p>
            </GlassCard>
            <DailyInspirationCards recipe={data.recipe} practiceAlong={data.practiceAlong} />
          </div>
        )}

        {data?.gate === "ok" && view === "fuel" && (
          <FuelDashboardView data={data} onOpenLog={() => setLogOpen(true)} />
        )}
        {data?.gate === "ok" && view === "statement" && <StatementView />}

        {data?.gate === "ok" && (
          <LogMealModal
            open={logOpen}
            onClose={() => setLogOpen(false)}
            mealPlan={data.mealPlan}
            dayTotal={data.dayTotal}
            target={data.target}
            estimationAvailable={data.estimationAvailable}
          />
        )}
      </PageContainer>
    </DashboardShell>
  );
}
