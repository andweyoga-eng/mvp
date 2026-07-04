import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadHealthDocumentFile } from "@/lib/health-document-upload";
import {
  HEALTH_DOCUMENT_MAX_BYTES,
  HEALTH_DOCUMENT_TOO_LARGE_MESSAGE,
  HEALTH_NO_CONCERNS_TEXT,
  isAllowedHealthDisclosureFile,
  type ConfirmedHealthState,
  type HealthDisclosureChoice,
  MAX_HEALTH_CONCERNS_CHARS,
  isHealthConcernsTextComplete,
  validateHealthDisclosureDraft,
} from "@shared/health-disclosure";

interface HealthUpdateSectionProps {
  confirmedHealth: ConfirmedHealthState;
  dropdownValue: HealthDisclosureChoice | "";
  isConcernsPanelOpen: boolean;

  onDropdownChange: (value: HealthDisclosureChoice) => void;
  onConfirmNoConcerns: () => void;
  onConfirmConcerns: (payload: { concernsText: string; documentUrls: string[] }) => void;
  onPanelCancel: () => void;
  onPanelOpenChange: (open: boolean) => void;

  onSaveAndSubmit: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  /** When true, page-level Save/Cancel are rendered by the parent (account layout). */
  hidePageActions?: boolean;
  saveDisabled?: boolean;
}

export function HealthUpdateSection({
  confirmedHealth,
  dropdownValue,
  isConcernsPanelOpen,
  onDropdownChange,
  onConfirmNoConcerns,
  onConfirmConcerns,
  onPanelCancel,
  onPanelOpenChange,
  onSaveAndSubmit,
  onCancel,
  isLoading,
  hidePageActions = false,
  saveDisabled = false,
}: HealthUpdateSectionProps) {
  const { toast } = useToast();
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);
  const [isFileTooLarge, setIsFileTooLarge] = useState(false);
  const [panelValidationError, setPanelValidationError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingConcernsText, setEditingConcernsText] = useState("");
  const [editingDocumentUrls, setEditingDocumentUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!isConcernsPanelOpen) return;
    setEditingConcernsText(
      confirmedHealth.choice === "concerns" ? confirmedHealth.concernsText : "",
    );
    setEditingDocumentUrls(
      confirmedHealth.choice === "concerns" ? [...confirmedHealth.documentUrls] : [],
    );
    setPanelValidationError("");
    setIsFileTooLarge(false);
  }, [isConcernsPanelOpen, confirmedHealth]);

  const trimmedEditing = editingConcernsText.trim();
  const isEditingTextValid = isHealthConcernsTextComplete(trimmedEditing);
  const isEditingTextOverLimit = trimmedEditing.length > MAX_HEALTH_CONCERNS_CHARS;

  const isOptionAConfirmed =
    confirmedHealth.choice === "none";
  const isOptionBConfirmed =
    confirmedHealth.choice === "concerns" && isHealthConcernsTextComplete(confirmedHealth.concernsText);

  async function uploadHealthDocument(file: File): Promise<void> {
    setIsFileTooLarge(false);
    setIsUploadInProgress(true);
    try {
      const result = await uploadHealthDocumentFile(file);
      if (!result.ok) {
        if (result.tooLarge) {
          setIsFileTooLarge(true);
          return;
        }
        toast({
          title: result.status === 404 ? "Upload unavailable" : "Upload failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setEditingDocumentUrls([result.objectPath]);
      toast({
        title: "Document attached",
        description: "Your file was uploaded. Click Save in this panel to confirm.",
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "You can still save your form without the file.",
        variant: "destructive",
      });
    } finally {
      setIsUploadInProgress(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handlePanelSave() {
    const validation = validateHealthDisclosureDraft("concerns", editingConcernsText);
    if (!validation.valid) {
      setPanelValidationError(validation.message ?? "Please complete your health concerns.");
      return;
    }

    onConfirmConcerns({
      concernsText: editingConcernsText.trim(),
      documentUrls: editingDocumentUrls,
    });
    onPanelOpenChange(false);
  }

  function handlePanelCancel() {
    onPanelCancel();
    onPanelOpenChange(false);
  }

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-orange-50">
        <CardTitle className="flex items-center gap-3 text-purple-800">
          <Heart className="h-6 w-6 text-purple-600" />
          Health Update - Your Wellness Story
        </CardTitle>
        <CardDescription className="text-purple-700 font-medium">
          🌟 <strong>Your wellbeing and safety are our topmost priority before you begin your yoga journey.</strong>
          <br />
          Please share any health information that helps us create the perfect practice for you!
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <Alert className="border-purple-200 bg-purple-50">
          <Heart className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            💝 <strong>Help us understand your unique wellness story!</strong> Share any recent surgeries, injuries,
            doctor recommendations, or physical considerations. If you have nothing to specify, choose{" "}
            <strong>No health concerns</strong>.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label className="text-purple-800 font-bold">
            Health Disclosure <span className="text-red-500">*</span>
          </Label>

          <Select
            value={dropdownValue}
            onValueChange={(value) => {
              if (value === "none") {
                onConfirmNoConcerns();
                return;
              }
              if (value === "concerns") {
                onDropdownChange("concerns");
              }
            }}
          >
            <SelectTrigger data-testid="health-disclosure-dropdown">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No health concerns</SelectItem>
              <SelectItem value="concerns">Yes, I have health concerns and want to specify</SelectItem>
            </SelectContent>
          </Select>

          {confirmedHealth.choice === "" && (
            <p className="text-sm text-orange-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Please choose an option to continue.
            </p>
          )}

          {isOptionAConfirmed && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Saved as “{HEALTH_NO_CONCERNS_TEXT}”
            </p>
          )}

          {isOptionBConfirmed && !isConcernsPanelOpen && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Health concerns saved.
              </p>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-purple-700"
                onClick={() => onPanelOpenChange(true)}
                data-testid="health-concerns-edit"
              >
                Edit details
              </Button>
            </div>
          )}
        </div>

        <Dialog
          open={isConcernsPanelOpen}
          onOpenChange={(open) => {
            if (!open) handlePanelCancel();
            else onPanelOpenChange(true);
          }}
        >
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle className="text-purple-900">
                Health concerns: please share details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="health-concerns-text" className="text-purple-800 font-bold">
                  Describe your health concerns <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="health-concerns-text"
                  placeholder="Share surgeries, injuries, doctor recommendations, or other considerations."
                  value={editingConcernsText}
                  onChange={(e) => {
                    setEditingConcernsText(e.target.value);
                    if (panelValidationError) setPanelValidationError("");
                  }}
                  maxLength={MAX_HEALTH_CONCERNS_CHARS}
                  className={`min-h-[140px] ${
                    panelValidationError || isEditingTextOverLimit
                      ? "border-red-500"
                      : "border-purple-200"
                  } focus:border-purple-500`}
                  data-testid="health-concerns-text"
                />

                <div className="flex items-center justify-between text-xs">
                  <p className={isEditingTextOverLimit ? "text-red-600" : "text-purple-700"}>
                    {trimmedEditing.length}/{MAX_HEALTH_CONCERNS_CHARS} characters
                  </p>

                  {isEditingTextOverLimit && (
                    <p className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Up to {MAX_HEALTH_CONCERNS_CHARS} characters
                    </p>
                  )}

                  {isEditingTextValid && !panelValidationError && (
                    <p className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </p>
                  )}
                </div>

                {panelValidationError && (
                  <p className="text-sm text-red-600 flex items-center gap-1" data-testid="health-concerns-panel-error">
                    <AlertCircle className="h-4 w-4" />
                    {panelValidationError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-purple-800 font-bold">Upload a supporting document (optional)</Label>
                <div className="flex items-start gap-3">
                  <input
                    ref={fileInputRef}
                    id="health-concerns-file"
                    type="file"
                    className="sr-only"
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!isAllowedHealthDisclosureFile(file)) {
                        toast({
                          title: "Unsupported file type",
                          description: "Please upload a PDF, JPG, or PNG file.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (file.size > HEALTH_DOCUMENT_MAX_BYTES) {
                        setIsFileTooLarge(true);
                        return;
                      }

                      setIsFileTooLarge(false);
                      await uploadHealthDocument(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadInProgress}
                    className="bg-white"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="health-concerns-choose-file"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose file
                  </Button>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Up to 1MB. PDF, JPG, or PNG.</p>
                    {editingDocumentUrls.length > 0 && (
                      <p className="text-green-700">A document is attached.</p>
                    )}
                  </div>
                </div>

                {isFileTooLarge && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-900">
                      {HEALTH_DOCUMENT_TOO_LARGE_MESSAGE}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePanelCancel}
                  disabled={isUploadInProgress || isLoading}
                  data-testid="health-concerns-panel-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handlePanelSave}
                  disabled={isUploadInProgress || isLoading}
                  className="bg-primary !text-white"
                  data-testid="health-concerns-panel-save"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {!hidePageActions && (
        <div className="pt-4 border-t border-purple-200 space-y-3">
          <Button
            onClick={onSaveAndSubmit}
            disabled={isLoading || saveDisabled}
            className="w-full bg-primary !text-white px-8 py-4 rounded-full font-bold hover:bg-primary/90 disabled:opacity-50"
            data-testid="health-save-and-submit"
          >
            {isLoading ? "Saving..." : "Save and Submit"}
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full border-purple-200 text-purple-800 hover:bg-purple-50 px-8 py-4 rounded-full font-bold"
            data-testid="health-cancel"
          >
            Cancel
          </Button>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
