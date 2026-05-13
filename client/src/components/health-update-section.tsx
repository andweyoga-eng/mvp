import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MIN_HEALTH_UPDATE_CHARS } from '@/lib/profile-constants';

/**
 * PRODUCT OWNER (POV) — Health document **file upload** is intentionally turned off until we
 * pick an object-storage provider (S3 / R2 / etc.) and need in-app uploads at that scale of
 * operations. Until then, members are asked to email detailed reports. To re-enable uploads:
 * set `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES` in `server/routes.ts`, restore the upload/delete
 * handlers in `my-account.tsx`, and add back the file UI block that lived below the health
 * textarea (git history / prior commits).
 */

interface HealthUpdateProps {
  healthUpdateText: string;
  /** Kept so “Save health update” still persists any URLs already stored in the DB. */
  healthDocumentUrls: string[];
  onHealthUpdateChange: (text: string) => void;
  onSave: (healthData: { healthUpdateText: string; healthDocumentUrls: string[] }) => Promise<void>;
  isLoading: boolean;
}

export function HealthUpdateSection({
  healthUpdateText,
  healthDocumentUrls,
  onHealthUpdateChange,
  onSave,
  isLoading,
}: HealthUpdateProps) {
  const trimmedHealth = healthUpdateText.trim();
  const isHealthUpdateValid = trimmedHealth.length >= MIN_HEALTH_UPDATE_CHARS;
  const hasRequiredInfo = isHealthUpdateValid;

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-orange-50">
        <CardTitle className="flex items-center gap-3 text-purple-800">
          <Heart className="h-6 w-6 text-purple-600" />
          Health Update - Your Wellness Story
        </CardTitle>
        <CardDescription className="text-purple-700 font-medium">
          🌟 <strong>Your wellbeing and safety are our topmost priority before you begin your yoga journey.</strong><br />
          Please share any health information that helps us create the perfect practice for you!
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <Alert className="border-purple-200 bg-purple-50">
          <Heart className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            💝 <strong>Help us understand your unique wellness story!</strong> Share any recent surgeries, injuries,
            doctor recommendations, or physical considerations. If you have nothing specific to mention, copy and paste:{' '}
            <strong>No current concerns</strong>.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="health-update" className="text-purple-800 font-bold">
            Health Update <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="health-update"
            placeholder='Share surgeries, injuries, doctor notes, or other considerations. If nothing to share, copy and paste this: No current concerns.'
            value={healthUpdateText}
            onChange={(e) => onHealthUpdateChange(e.target.value)}
            className={`min-h-[120px] ${trimmedHealth.length > 0 && !isHealthUpdateValid ? 'border-red-500' : 'border-purple-200'} focus:border-purple-500`}
            data-testid="health-update-text"
          />
          {trimmedHealth.length > 0 && !isHealthUpdateValid && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Enter at least {MIN_HEALTH_UPDATE_CHARS} characters — describe your situation, or copy and paste:{' '}
              <span className="font-medium">No current concerns</span>.
            </p>
          )}
          {isHealthUpdateValid && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Health Updates ✓
            </p>
          )}
        </div>

        <p
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          data-testid="health-report-email-note"
        >
          Please send a detailed report, if any, to mudit@andweyoga.com
        </p>

        <div className="pt-4 border-t border-purple-200">
          <Button
            onClick={() => onSave({ healthUpdateText, healthDocumentUrls })}
            disabled={!hasRequiredInfo || isLoading}
            className="w-full bg-primary !text-white px-8 py-4 rounded-full font-bold hover:bg-primary/90 disabled:opacity-50"
            data-testid="save-health-update"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Health Update...
              </div>
            ) : (
              'Save Health Update'
            )}
          </Button>

          {!hasRequiredInfo && (
            <p className="text-sm text-orange-600 text-center mt-2">
              Please enter at least {MIN_HEALTH_UPDATE_CHARS} characters in the health update above before saving.
            </p>
          )}
        </div>

        {hasRequiredInfo && !isLoading && (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Ready to save.</strong> Click &quot;Save Health Update&quot; to store this section. Session booking still
              requires a verified email and your personal details on the Profile tab.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
