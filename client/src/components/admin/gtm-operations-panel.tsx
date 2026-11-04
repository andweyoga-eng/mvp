import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Megaphone, Save, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import { heroSlideImageSrc } from "@/lib/hero-slide-images";
import {
  HERO_IMAGE_MAX_DIM,
  HERO_IMAGE_MAX_FILE_BYTES,
  compressImageForUpload,
  validateAdminImageFile,
} from "@/lib/image-upload";
import {
  HERO_CTA_HOME_SECTIONS,
  HERO_DISCLAIMER_MAX,
  HERO_DURATION_MAX_MS,
  HERO_DURATION_MIN_MS,
  HERO_SLIDE_WORDS,
  defaultHeroCtaConfig,
  defaultHeroSlideCta,
  shareHeroCta,
  shareHeroDisclaimer,
  type HeroCtaConfig,
  type HeroCtaLinkMode,
  type HeroPhrase,
  type HeroSlideCta,
  type HeroSlideWord,
} from "@shared/hero-cta";

const QUERY_KEY = ["/api/admin/gtm/hero-cta"] as const;

function SlidePositionHeading({ position }: { position: number }) {
  const spId = `SP${position}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p
          className="inline-flex cursor-help text-sm font-semibold text-[#3d1b80] underline decoration-dotted underline-offset-4"
          data-testid={`gtm-slide-position-${position}`}
        >
          {spId}
        </p>
      </TooltipTrigger>
      <TooltipContent>Slide Position</TooltipContent>
    </Tooltip>
  );
}

function SlideCtaFields({
  slide,
  slidePosition,
  hideHeading,
  onChange,
  disabled,
}: {
  slide: HeroSlideCta;
  /** 1-based slide position (SP1…). Omit for the shared apply-to-all form. */
  slidePosition?: number;
  /** Parent slide card already shows the position heading. */
  hideHeading?: boolean;
  onChange: (next: HeroSlideCta) => void;
  disabled?: boolean;
}) {
  const fieldKey = slidePosition != null ? `sp${slidePosition}` : "shared";
  const { data: flowCards, isLoading: flowCardsLoading } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/class-types"],
  });
  const knownFlowCard = flowCards?.some((card) => card.id === slide.classTypeId) ?? false;
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      {slidePosition != null && !hideHeading ? <SlidePositionHeading position={slidePosition} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor={`cta-label-${fieldKey}`}>CTA label</Label>
        <Input
          id={`cta-label-${fieldKey}`}
          value={slide.label}
          disabled={disabled}
          onChange={(e) => onChange({ ...slide, label: e.target.value })}
          maxLength={80}
          data-testid="gtm-cta-label"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Link type</Label>
        <Select
          value={slide.mode}
          disabled={disabled}
          onValueChange={(value: HeroCtaLinkMode) => onChange({ ...slide, mode: value })}
        >
          <SelectTrigger data-testid="gtm-cta-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="section">Home section</SelectItem>
            <SelectItem value="url">Custom URL / path</SelectItem>
            <SelectItem value="flow">and We Flow card</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {slide.mode === "section" ? (
        <div className="space-y-1.5">
          <Label>Home section</Label>
          <Select
            value={slide.sectionId}
            disabled={disabled}
            onValueChange={(sectionId) => onChange({ ...slide, sectionId })}
          >
            <SelectTrigger data-testid="gtm-cta-section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HERO_CTA_HOME_SECTIONS.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {slide.mode === "url" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`cta-url-${fieldKey}`}>URL or path</Label>
          <Input
            id={`cta-url-${fieldKey}`}
            value={slide.customUrl}
            disabled={disabled}
            onChange={(e) => onChange({ ...slide, customUrl: e.target.value })}
            placeholder="https://…, /path, or #teach"
            maxLength={2000}
            data-testid="gtm-cta-url"
          />
        </div>
      ) : null}
      {slide.mode === "flow" ? (
        <div className="space-y-1.5">
          <Label>and We Flow card</Label>
          <Select
            value={slide.classTypeId || undefined}
            disabled={disabled || flowCardsLoading}
            onValueChange={(classTypeId) => onChange({ ...slide, classTypeId })}
          >
            <SelectTrigger data-testid="gtm-cta-flow-card">
              <SelectValue placeholder={flowCardsLoading ? "Loading cards…" : "Choose a card"} />
            </SelectTrigger>
            <SelectContent>
              {slide.classTypeId && !knownFlowCard ? (
                <SelectItem value={slide.classTypeId}>Unavailable card</SelectItem>
              ) : null}
              {(flowCards ?? []).map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The button and the photo both open this card. Signed-out visitors see Sign in. A card with no upcoming sessions opens the waitlist.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function clampDurationMs(ms: number): number {
  if (!Number.isFinite(ms)) return HERO_DURATION_MIN_MS;
  return Math.min(HERO_DURATION_MAX_MS, Math.max(HERO_DURATION_MIN_MS, Math.round(ms)));
}

function SecondsField({
  id,
  label,
  ms,
  onMs,
}: {
  id: string;
  label: string;
  ms: number;
  onMs: (next: number) => void;
}) {
  const [text, setText] = useState(String(ms / 1000));

  useEffect(() => {
    setText(String(ms / 1000));
  }, [ms]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={HERO_DURATION_MIN_MS / 1000}
        max={HERO_DURATION_MAX_MS / 1000}
        step={0.1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const seconds = Number(text);
          const next = clampDurationMs(Number.isFinite(seconds) ? seconds * 1000 : ms);
          onMs(next);
          setText(String(next / 1000));
        }}
      />
    </div>
  );
}

function SlideImageField({
  slide,
  onChange,
}: {
  slide: HeroSlideCta;
  onChange: (next: HeroSlideCta) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-2">
      <Label>Banner image</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <img
          src={heroSlideImageSrc(slide)}
          alt=""
          className="h-24 w-40 rounded-lg border object-cover"
          data-testid={`gtm-slide-image-preview-${slide.word}`}
        />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {slide.imageUrl ? "Custom photo" : "Built-in photo"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={isUploading}
            data-testid={`gtm-slide-image-file-${slide.word}`}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fileErr = validateAdminImageFile(file, HERO_IMAGE_MAX_FILE_BYTES);
              if (fileErr) {
                toast({
                  title: file.size > HERO_IMAGE_MAX_FILE_BYTES ? "Image too large" : "Invalid image",
                  description: fileErr,
                  variant: "destructive",
                });
                e.target.value = "";
                return;
              }
              setIsUploading(true);
              try {
                const dataUrl = await compressImageForUpload(file, HERO_IMAGE_MAX_DIM);
                onChange({ ...slide, imageUrl: dataUrl });
                toast({ title: "Image attached", description: "Save the hero to publish it." });
              } catch (err) {
                toast({
                  title: "Could not process image",
                  description: err instanceof Error ? err.message : "Try a different file.",
                  variant: "destructive",
                });
              } finally {
                setIsUploading(false);
                e.target.value = "";
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {slide.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {slide.imageUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...slide, imageUrl: null })}
                data-testid={`gtm-slide-image-remove-${slide.word}`}
              >
                Remove image
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function updatePhrase(slide: HeroSlideCta, index: number, phrase: HeroPhrase): HeroSlideCta {
  return {
    ...slide,
    phrases: slide.phrases.map((current, i) => (i === index ? phrase : current)),
  };
}

function DisclaimerField({
  id,
  value,
  onChange,
  testId,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Disclaimer</Label>
      <Input
        id={id}
        value={value}
        maxLength={HERO_DISCLAIMER_MAX}
        placeholder="Optional. One short line."
        onChange={(e) => onChange(e.target.value.slice(0, HERO_DISCLAIMER_MAX))}
        data-testid={testId}
      />
      <p className="text-xs text-muted-foreground">
        {value.trim().length}/{HERO_DISCLAIMER_MAX} characters. Leave blank to show nothing. It sits in one line at the bottom-right corner of the photo.
      </p>
    </div>
  );
}

function SlideEditor({
  slide,
  position,
  slideCount,
  publishedCount,
  showCta,
  showDisclaimer,
  onChange,
  onDelete,
}: {
  slide: HeroSlideCta;
  position: number;
  slideCount: number;
  publishedCount: number;
  showCta: boolean;
  showDisclaimer: boolean;
  onChange: (next: HeroSlideCta) => void;
  onDelete: () => void;
}) {
  const onlyPublished = slide.published && publishedCount <= 1;

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4" data-testid={`gtm-slide-${slide.word}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <SlidePositionHeading position={position} />
          <p className="text-sm font-medium">{slide.word}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm" title={onlyPublished ? "At least one slide stays on the homepage." : undefined}>
            <Checkbox
              checked={slide.published}
              disabled={onlyPublished}
              onCheckedChange={(checked) => {
                if (checked !== true && onlyPublished) return;
                onChange({ ...slide, published: checked === true });
              }}
              data-testid={`gtm-slide-published-${slide.word}`}
            />
            Show on homepage
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={slideCount <= 1}
            title={slideCount <= 1 ? "At least one slide is required." : undefined}
            onClick={onDelete}
            data-testid={`gtm-slide-delete-${slide.word}`}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <SlideImageField slide={slide} onChange={onChange} />

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Each line is regular text plus an italic accent. Seconds is how long that line stays on screen (0.5 to 15).
        </p>
        {slide.phrases.map((phrase, index) => {
          const copyNumber = index + 1;
          return (
            <div key={copyNumber} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`copy-lead-${slide.word}-${copyNumber}`}>Copy {copyNumber} regular</Label>
                <Input
                  id={`copy-lead-${slide.word}-${copyNumber}`}
                  value={phrase.lead}
                  maxLength={80}
                  onChange={(e) =>
                    onChange(updatePhrase(slide, index, { ...phrase, lead: e.target.value }))
                  }
                  data-testid={`gtm-copy-lead-${slide.word}-${copyNumber}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`copy-accent-${slide.word}-${copyNumber}`}>Copy {copyNumber} italic</Label>
                <Input
                  id={`copy-accent-${slide.word}-${copyNumber}`}
                  value={phrase.accent}
                  maxLength={80}
                  onChange={(e) =>
                    onChange(updatePhrase(slide, index, { ...phrase, accent: e.target.value }))
                  }
                  data-testid={`gtm-copy-accent-${slide.word}-${copyNumber}`}
                />
              </div>
              <SecondsField
                id={`copy-seconds-${slide.word}-${copyNumber}`}
                label={`Copy ${copyNumber} seconds`}
                ms={phrase.durationMs}
                onMs={(durationMs) => onChange(updatePhrase(slide, index, { ...phrase, durationMs }))}
              />
            </div>
          );
        })}
        <SecondsField
          id={`hold-${slide.word}`}
          label="Pause after the last line (seconds)"
          ms={slide.holdMs}
          onMs={(holdMs) => onChange({ ...slide, holdMs })}
        />
        <p className="text-xs text-muted-foreground">
          The last line stays up for this extra time before the next slide. With one slide showing, the lines then repeat.
        </p>
      </div>

      {showDisclaimer ? (
        <DisclaimerField
          id={`disclaimer-${slide.word}`}
          value={slide.disclaimer}
          onChange={(disclaimer) => onChange({ ...slide, disclaimer })}
          testId={`gtm-slide-disclaimer-${slide.word}`}
        />
      ) : null}

      {showCta ? (
        <SlideCtaFields slide={slide} slidePosition={position} hideHeading onChange={onChange} />
      ) : null}
    </div>
  );
}

export function GtmOperationsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<HeroCtaConfig>(defaultHeroCtaConfig);
  const [wordToAdd, setWordToAdd] = useState<HeroSlideWord | "">("");

  const { data, isLoading, error } = useQuery<HeroCtaConfig>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/gtm/hero-cta", { headers: adminHeaders() });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: HeroCtaConfig) => {
      const res = await fetch("/api/admin/gtm/hero-cta", {
        method: "PUT",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await parseAdminApiError(res)).message);
      return res.json() as Promise<HeroCtaConfig>;
    },
    onSuccess: (saved) => {
      setDraft(saved);
      qc.setQueryData(QUERY_KEY, saved);
      qc.invalidateQueries({ queryKey: ["/api/hero-cta"] });
      toast({ title: "Hero saved", description: "The home carousel will use these slides." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  function updateSharedSlide(next: HeroSlideCta) {
    setDraft((prev) => ({
      ...prev,
      slides: shareHeroCta(prev.slides, next),
    }));
  }

  function updateSlideAt(index: number, next: HeroSlideCta) {
    setDraft((prev) => {
      const slides = prev.slides.map((slide, i) => (i === index ? next : slide));
      return { ...prev, slides };
    });
  }

  function setApplySame(checked: boolean) {
    setDraft((prev) => {
      if (!checked) return { ...prev, applySameLinkToAll: false };
      const template = prev.slides[0] ?? defaultHeroCtaConfig().slides[0]!;
      return {
        ...prev,
        applySameLinkToAll: true,
        slides: shareHeroCta(prev.slides, template),
      };
    });
  }

  function setApplySameDisclaimer(checked: boolean) {
    setDraft((prev) => {
      if (!checked) return { ...prev, applySameDisclaimerToAll: false };
      const template = prev.slides[0] ?? defaultHeroCtaConfig().slides[0]!;
      return {
        ...prev,
        applySameDisclaimerToAll: true,
        slides: shareHeroDisclaimer(prev.slides, template.disclaimer),
      };
    });
  }

  function updateSharedDisclaimer(disclaimer: string) {
    setDraft((prev) => ({
      ...prev,
      slides: shareHeroDisclaimer(prev.slides, disclaimer.slice(0, HERO_DISCLAIMER_MAX)),
    }));
  }

  function deleteSlide(index: number) {
    setDraft((prev) => {
      if (prev.slides.length <= 1) return prev;
      const removed = prev.slides[index];
      let slides = prev.slides.filter((_, i) => i !== index);
      if (removed?.published && !slides.some((slide) => slide.published) && slides[0]) {
        slides = slides.map((slide, i) => (i === 0 ? { ...slide, published: true } : slide));
      }
      return { ...prev, slides };
    });
  }

  function addSlide(word: HeroSlideWord) {
    setDraft((prev) => {
      if (prev.slides.some((slide) => slide.word === word)) return prev;
      const created = defaultHeroSlideCta(word);
      const template = prev.slides[0];
      let slide = prev.applySameLinkToAll && template ? shareHeroCta([created], template)[0]! : created;
      if (prev.applySameDisclaimerToAll && template) {
        slide = { ...slide, disclaimer: template.disclaimer };
      }
      const slides = HERO_SLIDE_WORDS.flatMap((candidate) => {
        if (candidate === word) return [slide];
        const existing = prev.slides.find((item) => item.word === candidate);
        return existing ? [existing] : [];
      });
      return { ...prev, slides };
    });
    setWordToAdd("");
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading GTM settings…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Could not load hero CTA config. {(error as Error).message}
      </p>
    );
  }

  const sharedSlide = draft.slides[0] ?? defaultHeroCtaConfig().slides[0]!;
  const publishedCount = draft.slides.filter((slide) => slide.published).length;
  const missingWords = HERO_SLIDE_WORDS.filter(
    (word) => !draft.slides.some((slide) => slide.word === word),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#3d1b80]" />
            Hero banner
          </CardTitle>
          <CardDescription>
            Choose which slides appear on the home hero. Edit each photo, the three lines of copy, and how long each line stays on screen. One selected slide shows alone. Several selected slides rotate. A swipe, the dots, and a tap on the image still use that slide&apos;s button link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.applySameLinkToAll}
              onCheckedChange={(checked) => setApplySame(checked === true)}
              data-testid="gtm-apply-same-all"
            />
            Apply the same link to all slides
          </label>

          {draft.applySameLinkToAll ? (
            <SlideCtaFields slide={sharedSlide} onChange={updateSharedSlide} />
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.applySameDisclaimerToAll}
              onCheckedChange={(checked) => setApplySameDisclaimer(checked === true)}
              data-testid="gtm-apply-same-disclaimer"
            />
            Apply the same disclaimer to all slides
          </label>

          {draft.applySameDisclaimerToAll ? (
            <DisclaimerField
              id="hero-shared-disclaimer"
              value={sharedSlide.disclaimer}
              onChange={updateSharedDisclaimer}
              testId="gtm-shared-disclaimer"
            />
          ) : null}

          <div className="space-y-4">
            {draft.slides.map((slide, index) => (
              <SlideEditor
                key={slide.word}
                slide={slide}
                position={index + 1}
                slideCount={draft.slides.length}
                publishedCount={publishedCount}
                showCta={!draft.applySameLinkToAll}
                showDisclaimer={!draft.applySameDisclaimerToAll}
                onChange={(next) => updateSlideAt(index, next)}
                onDelete={() => deleteSlide(index)}
              />
            ))}
          </div>

          {missingWords.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label>Add a removed slide</Label>
                <Select
                  value={wordToAdd || undefined}
                  onValueChange={(value) => setWordToAdd(value as HeroSlideWord)}
                >
                  <SelectTrigger className="w-[200px]" data-testid="gtm-add-slide-word">
                    <SelectValue placeholder="Choose a slide" />
                  </SelectTrigger>
                  <SelectContent>
                    {missingWords.map((word) => (
                      <SelectItem key={word} value={word}>
                        {word}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!wordToAdd}
                onClick={() => wordToAdd && addSlide(wordToAdd)}
                data-testid="gtm-add-slide"
              >
                Add slide
              </Button>
            </div>
          ) : null}

          <Button
            onClick={() => {
              const empty = draft.slides.find((slide) =>
                slide.phrases.some((phrase) => !phrase.lead.trim() && !phrase.accent.trim()),
              );
              if (empty) {
                toast({
                  title: "Copy is empty",
                  description: `${empty.word} needs regular text, italic text, or both on every line.`,
                  variant: "destructive",
                });
                return;
              }
              const linkSource = draft.applySameLinkToAll ? draft.slides[0] : null;
              const unmapped = (linkSource ? [linkSource] : draft.slides).find(
                (slide) => slide?.mode === "flow" && !slide.classTypeId.trim(),
              );
              if (unmapped) {
                toast({
                  title: "Choose a card",
                  description: `${unmapped.word} is set to an and We Flow card. Pick which card the button and photo should open.`,
                  variant: "destructive",
                });
                return;
              }
              if (publishedCount < 1) {
                toast({
                  title: "Choose a slide",
                  description: "Show at least one slide on the homepage.",
                  variant: "destructive",
                });
                return;
              }
              saveMutation.mutate(draft);
            }}
            disabled={saveMutation.isPending || publishedCount < 1}
            data-testid="gtm-hero-cta-save"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save hero"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </CardContent>
    </Card>
  );
}
