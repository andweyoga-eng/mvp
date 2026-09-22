/**
 * Track Diet v2 multi-item modal (SPEC-WEDIET-TRACK-DIET-V2).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Trash2, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  appendFuelMealItem,
  estimateFuelMeal,
  estimateFuelMealFromWeight,
  fetchFuelMealNameSuggestions,
  FuelEstimateRequestError,
  logFuelMealBatch,
} from "@/lib/fuel-api";
import {
  estimateErrorCopy,
  FUEL_CUSTOM_MEAL_NAME_PLACEHOLDER,
  FUEL_DRAFT_UNDER_NOTE,
  FUEL_ESTIMATE_FAILURE_COPY,
  FUEL_ESTIMATE_LOW_COPY,
  FUEL_ESTIMATE_PHOTO_FORMATS_COPY,
  FUEL_ESTIMATE_PHOTO_HEIC_COPY,
  FUEL_ESTIMATE_SUCCESS_COPY,
  FUEL_OUTSIDE_SLOTS_TITLE,
  fuelEstimatePhotoFileError,
  gramsToOz,
  isLocalTimeInSlot,
  midpointHhmm,
  ozToGrams,
  resolveFuelMealPlanForTracking,
  type FuelCaptureMethod,
  type FuelEstimateReviewState,
  type FuelMacros,
  type FuelMealPlan,
} from "@shared/fuel";

type Step =
  | "select"
  | "items"
  | "upload"
  | "camera"
  | "scanning"
  | "confirm"
  | "error"
  | "review";

type DraftItem = {
  localId: string;
  method: FuelCaptureMethod;
  name: string;
  calories: number;
  confidence: number | null;
  weightG: number | null;
  macros: FuelMacros | null;
  fromWeight?: boolean;
};

type DraftPayload = {
  localDate: string;
  slotIndex: number | null;
  customName: string;
  items: DraftItem[];
};

function draftStorageKey(localDate: string, slotIndex: number | null) {
  return `wediet-draft:${localDate}:${slotIndex ?? "outside"}`;
}

function todayLocalDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function loadDraft(localDate: string, slotIndex: number | null): DraftPayload | null {
  try {
    const raw = localStorage.getItem(draftStorageKey(localDate, slotIndex));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (parsed.localDate !== localDate) {
      localStorage.removeItem(draftStorageKey(localDate, slotIndex));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(payload: DraftPayload) {
  localStorage.setItem(draftStorageKey(payload.localDate, payload.slotIndex), JSON.stringify(payload));
}

function clearDraft(localDate: string, slotIndex: number | null) {
  localStorage.removeItem(draftStorageKey(localDate, slotIndex));
}

function newLocalId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TrackDietModal({
  open,
  onClose,
  mealPlan,
  dayTotal,
  target,
  estimationAvailable,
  appendTarget = null,
}: {
  open: boolean;
  onClose: () => void;
  mealPlan: FuelMealPlan;
  dayTotal: number;
  target: number;
  estimationAvailable: boolean;
  /** When set, skip select and save via append endpoint. */
  appendTarget?: {
    mealGroupId: string;
    mealTitle: string;
    mealSlotIndex: number | null;
    eatenLocalTime?: string | null;
  } | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const slots = resolveFuelMealPlanForTracking(mealPlan);
  const isAppend = Boolean(appendTarget?.mealGroupId);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const weightAbortRef = useRef<AbortController | null>(null);
  const densityRef = useRef<number | null>(null);
  const suggestTimerRef = useRef<number | undefined>(undefined);

  const [step, setStep] = useState<Step>("select");
  const [localDate] = useState(todayLocalDate);
  const [slotIndex, setSlotIndex] = useState<number | null>(0);
  const [customName, setCustomName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<
    Array<{ name: string; source: "personal" | "catalog" }>
  >([]);

  const [pendingMethod, setPendingMethod] = useState<FuelCaptureMethod>("manual");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [weightUnit, setWeightUnit] = useState<"g" | "oz">("g");
  const [macros, setMacros] = useState<FuelMacros | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reviewState, setReviewState] = useState<FuelEstimateReviewState | "manual" | "weight" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [weightEstimating, setWeightEstimating] = useState(false);
  const [weightEstimateError, setWeightEstimateError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  /** When logging a named slot outside its window, stamp eaten time at slot midpoint. */
  const [lateLogEatenLocalTime, setLateLogEatenLocalTime] = useState<string | null>(null);
  const [slotWindowPrompt, setSlotWindowPrompt] = useState<{
    slotIndex: number;
    label: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  const nowLocalTime = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return `${get("hour")}:${get("minute")}`;
  };

  const proceedFromSelect = (nextSlot: number | null, eatenStamp: string | null) => {
    setLateLogEatenLocalTime(eatenStamp);
    const draft = loadDraft(localDate, nextSlot);
    if (draft?.items?.length) {
      setItems(draft.items);
      setCustomName(draft.customName || customName);
    } else {
      setItems([]);
    }
    setStep("items");
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const clearPhotoPreview = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
  };

  const resetConfirmFields = () => {
    setName("");
    setCalories("");
    setWeightInput("");
    setMacros(null);
    setConfidence(null);
    setReviewState(null);
    setLastFile(null);
    clearPhotoPreview();
    densityRef.current = null;
    setWeightEstimateError(null);
    setWeightEstimating(false);
  };

  const persistDraft = (nextItems: DraftItem[], nextCustom = customName, nextSlot = slotIndex) => {
    saveDraft({
      localDate,
      slotIndex: nextSlot,
      customName: nextCustom,
      items: nextItems,
    });
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      weightAbortRef.current?.abort();
      return;
    }
    setEditingLocalId(null);
    resetConfirmFields();
    setNameSuggestions([]);
    setLateLogEatenLocalTime(null);
    setSlotWindowPrompt(null);
    if (isAppend && appendTarget) {
      setSlotIndex(appendTarget.mealSlotIndex);
      setCustomName(appendTarget.mealTitle);
      setItems([]);
      setStep("items");
    } else {
      setStep("select");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAppend, appendTarget?.mealGroupId]);

  const requestNameSuggestions = (q: string) => {
    window.clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = window.setTimeout(() => {
      void fetchFuelMealNameSuggestions(q).then(setNameSuggestions);
    }, 220);
  };

  useEffect(() => () => {
    stopCamera();
    clearPhotoPreview();
    weightAbortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "camera") return;
    let cancelled = false;
    const bind = () => {
      const stream = streamRef.current;
      const video = videoRef.current;
      if (!stream || !video || cancelled) return;
      video.srcObject = stream;
      void video.play().then(() => {
        if (!cancelled) setCameraReady(true);
      });
    };
    const raf = requestAnimationFrame(bind);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [step]);

  // Density / weight live recalc
  const weightGrams = (() => {
    const n = Number(weightInput);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(weightUnit === "oz" ? ozToGrams(n) : n);
  })();

  useEffect(() => {
    if (step !== "confirm") return;
    if (weightGrams == null) return;
    const cal = Number(calories);
    if (Number.isFinite(cal) && cal > 0 && densityRef.current == null) {
      densityRef.current = cal / (weightGrams / 100);
    }
    if (densityRef.current != null && Number.isFinite(cal)) {
      // when weight changes and density known, recompute calories from density
    }
  }, [weightGrams, calories, step]);

  const onWeightChange = (raw: string) => {
    setWeightInput(raw);
    setWeightEstimateError(null);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const g = Math.round(weightUnit === "oz" ? ozToGrams(n) : n);
    const cal = Number(calories);
    if (densityRef.current == null && Number.isFinite(cal) && cal > 0) {
      densityRef.current = cal / (g / 100);
      return;
    }
    if (densityRef.current != null) {
      const nextCal = Math.round(densityRef.current * (g / 100));
      setCalories(String(Math.max(0, nextCal)));
    }
  };

  const onCaloriesChange = (raw: string) => {
    setCalories(raw);
    setWeightEstimateError(null);
    const cal = Number(raw);
    if (!Number.isFinite(cal) || cal < 0) return;
    if (weightGrams != null && weightGrams > 0 && raw.trim() !== "") {
      densityRef.current = cal / (weightGrams / 100);
    }
  };

  // Weight-only estimate when calories cleared
  useEffect(() => {
    if (step !== "confirm") return;
    if (!estimationAvailable) return;
    if (calories.trim() !== "") return;
    if (weightGrams == null) return;
    if (!name.trim()) {
      setWeightEstimateError("Add a food name first…");
      return;
    }

    const t = window.setTimeout(() => {
      weightAbortRef.current?.abort();
      const ac = new AbortController();
      weightAbortRef.current = ac;
      setWeightEstimating(true);
      setWeightEstimateError(null);
      void estimateFuelMealFromWeight(
        { name: name.trim(), weightGrams },
        { signal: ac.signal },
      )
        .then((est) => {
          if (ac.signal.aborted) return;
          setCalories(String(est.calories));
          setMacros(est.macros ?? null);
          setConfidence(est.confidence);
          setReviewState("weight");
          if (weightGrams > 0 && est.calories > 0) {
            densityRef.current = est.calories / (weightGrams / 100);
          }
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          if (err instanceof FuelEstimateRequestError) {
            setWeightEstimateError(estimateErrorCopy(err.body.error));
            return;
          }
          setWeightEstimateError(
            err instanceof Error ? err.message : "Couldn't estimate from weight. Enter calories by hand",
          );
        })
        .finally(() => {
          if (!ac.signal.aborted) setWeightEstimating(false);
        });
    }, 700);

    return () => window.clearTimeout(t);
  }, [calories, weightGrams, name, step, estimationAvailable]);

  const startLiveCamera = async () => {
    setCameraStarting(true);
    setErrorMessage("");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStep("camera");
      setPendingMethod("capture");
    } catch {
      toast({
        title: "Camera unavailable",
        description: "Allow camera access, or choose from library.",
        variant: "destructive",
      });
      setStep("upload");
    } finally {
      setCameraStarting(false);
    }
  };

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob) return;
    stopCamera();
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    void onPickPhoto(file, "capture");
  };

  const onPickPhoto = async (file: File | null, method: FuelCaptureMethod = "upload") => {
    if (!file) return;
    const fileErr = fuelEstimatePhotoFileError(file);
    if (fileErr) {
      toast({ title: "Photo not supported", description: fileErr, variant: "destructive" });
      return;
    }
    clearPhotoPreview();
    setLastFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setPendingMethod(method);
    setStep("scanning");
    setErrorMessage("");
    setErrorCode(null);
    try {
      const est = await estimateFuelMeal(file);
      setName(est.name);
      setCalories(est.calories ? String(est.calories) : "");
      setMacros(est.macros ?? null);
      setConfidence(est.confidence);
      setReviewState(est.reviewState);
      densityRef.current = null;
      setStep("confirm");
    } catch (err) {
      if (err instanceof FuelEstimateRequestError) {
        setErrorCode(err.body.error);
        setErrorMessage(estimateErrorCopy(err.body.error));
        setStep("error");
        return;
      }
      setErrorCode("provider_down");
      setErrorMessage(estimateErrorCopy("provider_down"));
      setStep("error");
    }
  };

  const beginManual = () => {
    resetConfirmFields();
    setPendingMethod("manual");
    setReviewState("manual");
    setStep("confirm");
  };

  const addOrUpdateItem = () => {
    const cal = Number(calories);
    if (!name.trim() || !Number.isFinite(cal) || cal < 0) {
      toast({ title: "Name and calories required", variant: "destructive" });
      return;
    }
    const nextItem: DraftItem = {
      localId: editingLocalId || newLocalId(),
      method: pendingMethod,
      name: name.trim(),
      calories: Math.round(cal),
      confidence: reviewState === "manual" ? null : confidence,
      weightG: weightGrams,
      macros,
      fromWeight: reviewState === "weight",
    };
    const next = editingLocalId
      ? items.map((i) => (i.localId === editingLocalId ? nextItem : i))
      : [...items, nextItem];
    setItems(next);
    persistDraft(next);
    setEditingLocalId(null);
    resetConfirmFields();
    setStep("items");
  };

  const editItem = (item: DraftItem) => {
    setEditingLocalId(item.localId);
    setPendingMethod(item.method);
    setName(item.name);
    setCalories(String(item.calories));
    setWeightInput(item.weightG != null ? String(item.weightG) : "");
    setWeightUnit("g");
    setMacros(item.macros);
    setConfidence(item.confidence);
    setReviewState(item.fromWeight ? "weight" : item.confidence == null ? "manual" : "success");
    densityRef.current =
      item.weightG != null && item.weightG > 0 ? item.calories / (item.weightG / 100) : null;
    setStep("confirm");
  };

  const removeItem = (localId: string) => {
    const next = items.filter((i) => i.localId !== localId);
    setItems(next);
    persistDraft(next);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isAppend && appendTarget) {
        // Append only the latest pending single-item path: items list should have exactly the new ones this session
        // Save all items in the list that aren't yet persisted — in append mode we add one at a time via review of items
        for (const i of items) {
          await appendFuelMealItem(appendTarget.mealGroupId, {
            name: i.name,
            calories: i.calories,
            weightG: i.weightG,
            captureMethod: i.method,
            confidence: i.confidence,
            macros: i.macros,
            eatenLocalTime: appendTarget.eatenLocalTime ?? null,
          });
        }
        return { appended: items.length };
      }
      const slot = slotIndex == null ? null : slots.find((s) => s.index === slotIndex);
      const mealTitle =
        customName.trim() ||
        (slotIndex == null ? FUEL_OUTSIDE_SLOTS_TITLE : slot?.label || "Meal");
      const mealGroupId = newLocalId();
      return logFuelMealBatch({
        mealGroupId,
        mealTitle,
        mealSlotIndex: slotIndex,
        items: items.map((i) => ({
          name: i.name,
          calories: i.calories,
          weightG: i.weightG,
          captureMethod: i.method,
          confidence: i.confidence,
          macros: i.macros,
          eatenLocalTime: lateLogEatenLocalTime,
        })),
      });
    },
    onSuccess: async () => {
      clearDraft(localDate, slotIndex);
      setLateLogEatenLocalTime(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-statement"] });
      toast({ title: isAppend ? "Item added" : "Added to Calorie Bank" });
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const onSelectContinue = () => {
    if (slotIndex == null) {
      proceedFromSelect(null, null);
      return;
    }
    const slot = slots.find((s) => s.index === slotIndex);
    if (!slot) {
      proceedFromSelect(slotIndex, null);
      return;
    }
    const now = nowLocalTime();
    if (isLocalTimeInSlot(now, slot.startTime, slot.endTime)) {
      proceedFromSelect(slotIndex, null);
      return;
    }
    setSlotWindowPrompt({
      slotIndex,
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const onSlotChange = (idx: number | null) => {
    setSlotIndex(idx);
    setLateLogEatenLocalTime(null);
    setSlotWindowPrompt(null);
    const draft = loadDraft(localDate, idx);
    if (draft) {
      setCustomName(draft.customName);
      setItems(draft.items);
    } else {
      setCustomName("");
      setItems([]);
    }
  };

  if (!open) return null;

  const runningTotal = items.reduce((s, i) => s + i.calories, 0);
  const previewTotal = dayTotal + runningTotal;
  const slotLabel =
    slotIndex == null
      ? FUEL_OUTSIDE_SLOTS_TITLE
      : slots.find((s) => s.index === slotIndex)?.label ?? "Meal";
  const displayTitle = customName.trim() || slotLabel;

  const advisoryCopy =
    reviewState === "success"
      ? FUEL_ESTIMATE_SUCCESS_COPY
      : reviewState === "low"
        ? FUEL_ESTIMATE_LOW_COPY
        : reviewState === "failure"
          ? FUEL_ESTIMATE_FAILURE_COPY
          : null;

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="fuel-log-modal"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-[22px] bg-dz-surface p-6 shadow-[0_24px_60px_rgba(27,28,27,0.18)]"
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
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0] ?? null, "capture");
            e.target.value = "";
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0] ?? null, "upload");
            e.target.value = "";
          }}
        />

        {!isAppend && (
          <p className="mb-3 pr-8 text-[11px] leading-snug text-muted-foreground">{FUEL_DRAFT_UNDER_NOTE}</p>
        )}
        {isAppend && (
          <p className="mb-3 pr-8 text-[11px] leading-snug text-muted-foreground">
            Adding to <span className="font-semibold text-primary">{displayTitle}</span>
          </p>
        )}

        {step === "select" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Track your Diet</h3>
            <p className="mt-1 text-xs text-muted-foreground">Pick a meal slot, then add one or more items.</p>
            <div className="mt-4 space-y-2">
              {slots.map((s) => (
                <button
                  key={s.index}
                  type="button"
                  onClick={() => onSlotChange(s.index)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm",
                    slotIndex === s.index
                      ? "border-primary bg-primary/5 font-semibold text-primary"
                      : "border-input text-muted-foreground",
                  )}
                >
                  <span>{s.label}</span>
                  <span className="font-mono text-xs">
                    {s.startTime}-{s.endTime}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSlotChange(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm",
                  slotIndex == null
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "border-input text-muted-foreground",
                )}
              >
                <span>{FUEL_OUTSIDE_SLOTS_TITLE}</span>
                <span className="text-xs">Anytime</span>
              </button>
            </div>
            <label className="mt-4 mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Custom meal name (optional)
            </label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={FUEL_CUSTOM_MEAL_NAME_PLACEHOLDER}
            />
            <Button className="mt-4 w-full" onClick={onSelectContinue}>
              Continue
            </Button>
          </>
        )}

        {step === "items" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">{displayTitle}</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {items.length} item{items.length === 1 ? "" : "s"} · {runningTotal} cal
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {estimationAvailable && (
                <>
                  <Button onClick={() => void startLiveCamera()} disabled={cameraStarting}>
                    <Camera className="mr-2 h-4 w-4" />
                    Take photo
                  </Button>
                  <Button variant="secondary" onClick={() => setStep("upload")}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={beginManual}>
                Manual
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No items yet. Add one above.</p>
              )}
              {items.map((item, idx) => (
                <div
                  key={item.localId}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/[0.03] px-3 py-2"
                >
                  <span className="w-6 shrink-0 font-mono text-xs font-bold text-primary">{idx + 1})</span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editItem(item)}>
                    <p className="truncate text-sm font-semibold text-primary">{item.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {item.weightG != null ? `${item.weightG}g · ` : ""}
                      {item.calories} cal
                    </p>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-[#ba1a1a]"
                    onClick={() => removeItem(item.localId)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              {!isAppend && (
                <Button variant="secondary" className="flex-1" onClick={() => setStep("select")}>
                  Back
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!items.length}
                onClick={() => setStep("review")}
              >
                Review
              </Button>
            </div>
          </>
        )}

        {step === "upload" && estimationAvailable && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Upload a photo</h3>
            <div
              role="button"
              tabIndex={0}
              onClick={() => libraryInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onPickPhoto(e.dataTransfer.files?.[0] ?? null, "upload");
              }}
              className={cn(
                "mt-4 flex h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground",
                dragOver ? "border-primary bg-primary/[0.08]" : "border-primary/25",
              )}
            >
              <ImagePlus className="h-8 w-8 text-primary/70" />
              Drag a photo here, or choose from library
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {FUEL_ESTIMATE_PHOTO_FORMATS_COPY}
              <br />
              {FUEL_ESTIMATE_PHOTO_HEIC_COPY}
            </p>
            <Button className="mt-4 w-full" onClick={() => libraryInputRef.current?.click()}>
              Choose from library
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => setStep("items")}>
              Back
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm text-white">
                  Starting camera…
                </div>
              )}
            </div>
            <Button className="mt-4 w-full" disabled={!cameraReady} onClick={() => void captureFromVideo()}>
              Capture
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                stopCamera();
                setStep("items");
              }}
            >
              Cancel
            </Button>
          </>
        )}

        {step === "scanning" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Scanning…</h3>
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="mt-4 h-[120px] w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-4 flex h-[90px] items-center justify-center rounded-xl bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">Estimating calories for this item…</p>
          </>
        )}

        {step === "error" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Couldn’t estimate</h3>
            <p className="mt-3 text-sm text-muted-foreground">{errorMessage}</p>
            {(errorCode === "no_food" || errorCode === "screen_food" || estimationAvailable) && (
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  resetConfirmFields();
                  void startLiveCamera();
                }}
              >
                Retake photo
              </Button>
            )}
            <Button variant="secondary" className="mt-2 w-full" onClick={beginManual}>
              Enter manually
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => setStep("items")}>
              Back to items
            </Button>
          </>
        )}

        {step === "confirm" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">
              {editingLocalId ? "Edit item" : "Confirm item"}
            </h3>
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="mt-4 h-[90px] w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-4 flex h-[70px] items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Utensils className="h-7 w-7" />
              </div>
            )}
            {advisoryCopy && (
              <p className="mt-3 rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2 text-xs">
                {advisoryCopy}
              </p>
            )}
            {reviewState === "weight" && (
              <p className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Estimated from weight
                {weightGrams != null && Number(calories) > 0
                  ? ` · ~${Math.round(Number(calories) / (weightGrams / 100))} cal/100g`
                  : ""}
              </p>
            )}
            {reviewState === "manual" && (
              <p className="mt-3 text-xs text-muted-foreground">Manual entry. Nothing was estimated.</p>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Food</label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    requestNameSuggestions(e.target.value);
                  }}
                  onFocus={() => requestNameSuggestions(name)}
                  placeholder="Food name"
                  autoComplete="off"
                />
                {nameSuggestions.length > 0 && (
                  <ul className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-primary/15 bg-dz-surface shadow-sm">
                    {nameSuggestions.map((s) => (
                      <li key={`${s.source}:${s.name}`}>
                        <button
                          type="button"
                          className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5"
                          onClick={() => {
                            setName(s.name);
                            setNameSuggestions([]);
                          }}
                        >
                          <span>{s.name}</span>
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {s.source === "personal" ? "Yours" : "Database"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    Calories
                    {weightEstimating && (
                      <span className="inline-flex items-center gap-1.5 text-primary" aria-live="polite">
                        <Loader2 className="h-5 w-5 animate-spin stroke-[2.75]" />
                        <span className="text-[11px] font-bold normal-case tracking-normal">
                          Estimating…
                        </span>
                      </span>
                    )}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={calories}
                    onChange={(e) => onCaloriesChange(e.target.value)}
                    placeholder="0"
                    className={weightEstimating ? "border-primary/40 ring-2 ring-primary/20" : undefined}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Weight
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={weightInput}
                      onChange={(e) => onWeightChange(e.target.value)}
                      placeholder="0"
                    />
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={weightUnit}
                      onChange={(e) => {
                        const next = e.target.value as "g" | "oz";
                        const n = Number(weightInput);
                        if (Number.isFinite(n) && n > 0) {
                          if (weightUnit === "g" && next === "oz") {
                            setWeightInput(String(Math.round(gramsToOz(n) * 100) / 100));
                          } else if (weightUnit === "oz" && next === "g") {
                            setWeightInput(String(Math.round(ozToGrams(n))));
                          }
                        }
                        setWeightUnit(next);
                      }}
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>
              </div>
              {weightEstimateError && (
                <p className="text-xs text-[#ba1a1a]">{weightEstimateError}</p>
              )}
              {macros && (
                <div className="rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">Macros</p>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    P {macros.protein}g · C {macros.carbs}g · F {macros.fat}g · Fiber {macros.fiber}g
                  </p>
                </div>
              )}
            </div>
            <Button className="mt-4 w-full" onClick={addOrUpdateItem}>
              {editingLocalId ? "Update item" : "Add item"}
            </Button>
            {estimationAvailable && pendingMethod !== "manual" && (
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => {
                  resetConfirmFields();
                  void startLiveCamera();
                }}
              >
                Retake photo
              </Button>
            )}
            <Button variant="secondary" className="mt-2 w-full" onClick={() => setStep("items")}>
              Cancel
            </Button>
          </>
        )}

        {step === "review" && (
          <>
            <h3 className="font-display text-xl font-bold text-primary">Review meal</h3>
            <p className="mt-1 text-sm text-muted-foreground">{displayTitle}</p>
            <ul className="mt-4 space-y-2">
              {items.map((item, idx) => (
                <li
                  key={item.localId}
                  className="flex items-center justify-between rounded-xl bg-primary/[0.04] px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium text-primary">
                    <span className="mr-1.5 font-mono font-bold">{idx + 1})</span>
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.weightG != null ? `${item.weightG}g · ` : ""}
                    {item.calories}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-sm font-semibold text-primary">
              Total {runningTotal} cal
              <span className="ml-2 font-normal text-muted-foreground">
                · day preview {previewTotal} / {target}
              </span>
            </p>
            <Button
              className="mt-4 w-full"
              disabled={!items.length || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {isAppend ? "Add to meal" : "Add to Calorie Bank"}
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => setStep("items")}>
              Back to items
            </Button>
          </>
        )}
      </div>
    </div>
    {slotWindowPrompt && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
        data-testid="fuel-slot-window-prompt"
      >
        <div className="w-full max-w-sm rounded-[22px] bg-dz-surface p-6 shadow-xl">
          <h3 className="font-display text-lg font-bold text-primary">Outside this meal window</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {slotWindowPrompt.label} is set for {slotWindowPrompt.startTime}-{slotWindowPrompt.endTime}{" "}
            (your local time). Log under that meal anyway, or use {FUEL_OUTSIDE_SLOTS_TITLE}?
          </p>
          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                const stamp = midpointHhmm(slotWindowPrompt.startTime, slotWindowPrompt.endTime);
                setSlotIndex(slotWindowPrompt.slotIndex);
                setSlotWindowPrompt(null);
                proceedFromSelect(slotWindowPrompt.slotIndex, stamp);
              }}
            >
              Keep {slotWindowPrompt.label}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSlotIndex(null);
                setCustomName("");
                setSlotWindowPrompt(null);
                proceedFromSelect(null, null);
              }}
            >
              Use {FUEL_OUTSIDE_SLOTS_TITLE}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setSlotWindowPrompt(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}
    </>,
    document.body,
  );
}
