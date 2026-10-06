import { useEffect, useState } from "react";
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
import { Megaphone, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError } from "@/lib/admin-api";
import {
  HERO_CTA_HOME_SECTIONS,
  HERO_SLIDE_WORDS,
  defaultHeroCtaConfig,
  type HeroCtaConfig,
  type HeroCtaLinkMode,
  type HeroSlideCta,
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
  onChange,
  disabled,
}: {
  slide: HeroSlideCta;
  /** 1-based slide position (SP1…); omit for the shared “apply to all” form */
  slidePosition?: number;
  onChange: (next: HeroSlideCta) => void;
  disabled?: boolean;
}) {
  const fieldKey = slidePosition != null ? `sp${slidePosition}` : "shared";
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      {slidePosition != null ? <SlidePositionHeading position={slidePosition} /> : null}
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
      ) : (
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
      )}
    </div>
  );
}

export function GtmOperationsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<HeroCtaConfig>(defaultHeroCtaConfig);

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
      toast({ title: "Hero CTA saved", description: "Live home carousel will use these links." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  function updateSharedSlide(next: HeroSlideCta) {
    setDraft((prev) => ({
      ...prev,
      slides: prev.slides.map(() => ({ ...next })),
    }));
  }

  function updateSlideAt(index: number, next: HeroSlideCta) {
    setDraft((prev) => {
      const slides = prev.slides.map((s, i) => (i === index ? next : s));
      return { ...prev, slides };
    });
  }

  function setApplySame(checked: boolean) {
    setDraft((prev) => {
      if (checked) {
        const template = prev.slides[0] ?? defaultHeroCtaConfig().slides[0]!;
        return {
          applySameLinkToAll: true,
          slides: prev.slides.map(() => ({ ...template })),
        };
      }
      return { ...prev, applySameLinkToAll: false };
    });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#3d1b80]" />
            Hero banner CTA
          </CardTitle>
          <CardDescription>
            Configure the label and destination for each home hero slide. Image taps outside the
            button use the same link.
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
          ) : (
            <div className="space-y-4">
              {HERO_SLIDE_WORDS.map((_, index) => (
                <SlideCtaFields
                  key={index}
                  slidePosition={index + 1}
                  slide={draft.slides[index] ?? sharedSlide}
                  onChange={(next) => updateSlideAt(index, next)}
                />
              ))}
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate(draft)}
            disabled={saveMutation.isPending}
            data-testid="gtm-hero-cta-save"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save hero CTA"}
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
