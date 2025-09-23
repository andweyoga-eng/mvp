import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Heart, Upload, FileText, AlertCircle, CheckCircle2, Download, Trash2 } from 'lucide-react';

interface HealthUpdateProps {
  healthUpdateText: string;
  healthDocumentUrls: string[];
  onHealthUpdateChange: (text: string) => void;
  onDocumentUpload: (files: FileList) => void;
  onDocumentDelete: (url: string) => void;
  onSave: (healthData: { healthUpdateText: string; healthDocumentUrls: string[] }) => Promise<void>;
  isLoading: boolean;
}

export function HealthUpdateSection({
  healthUpdateText,
  healthDocumentUrls,
  onHealthUpdateChange,
  onDocumentUpload,
  onDocumentDelete,
  onSave,
  isLoading
}: HealthUpdateProps) {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    // Validate file types and sizes
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/tiff',
      'image/bmp',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 3;

    if (healthDocumentUrls.length + files.length > maxFiles) {
      toast({
        title: "File Limit Exceeded",
        description: `You can upload a maximum of ${maxFiles} health documents.`,
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported format. Please upload PDF, JPEG, PNG, TIFF, BMP, GIF, DOC, or DOCX files.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds the 10MB size limit.`,
          variant: "destructive",
        });
        continue;
      }
    }

    onDocumentUpload(files);
  };

  const isHealthUpdateValid = healthUpdateText.trim().length >= 1;
  const hasRequiredInfo = isHealthUpdateValid;

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-orange-50">
        <CardTitle className="flex items-center gap-3 text-purple-800">
          <Heart className="h-6 w-6 text-purple-600" />
          Health Update - Your Wellness Story
        </CardTitle>
        <CardDescription className="text-purple-700 font-medium">
          🌟 <strong>Your wellbeing and safety are our topmost priority before you begin your yoga journey.</strong><br/>
          Please share any health information that helps us create the perfect practice for you!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Informative Message */}
        <Alert className="border-purple-200 bg-purple-50">
          <Heart className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            💝 <strong>Help us understand your unique wellness story!</strong> Share any recent surgeries, injuries, 
            doctor recommendations, or physical considerations. If you have nothing specific to mention, 
            simply enter <strong>'None'</strong> - we've got you covered!
          </AlertDescription>
        </Alert>

        {/* Health Update Text Field - Mandatory */}
        <div className="space-y-2">
          <Label htmlFor="health-update" className="text-purple-800 font-bold">
            Health Update <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="health-update"
            placeholder="Please share any health information, recent surgeries, injuries, doctor recommendations, or physical considerations. If nothing to share, enter 'None'."
            value={healthUpdateText}
            onChange={(e) => onHealthUpdateChange(e.target.value)}
            className={`min-h-[120px] ${!isHealthUpdateValid && healthUpdateText.length > 0 ? 'border-red-500' : 'border-purple-200'} focus:border-purple-500`}
            data-testid="health-update-text"
          />
          {!isHealthUpdateValid && healthUpdateText.length > 0 && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Health update is required. Enter 'None' if no health concerns to share.
            </p>
          )}
          {isHealthUpdateValid && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Health update completed ✓
            </p>
          )}
        </div>

        {/* File Upload Section - Optional */}
        <div className="space-y-4">
          <Label className="text-purple-800 font-bold">
            Medical Documents <span className="text-sm text-purple-600 font-normal">(Optional)</span>
          </Label>
          <p className="text-sm text-purple-600">
            Upload any relevant medical documents, test results, or doctor's notes (PDF, JPEG, PNG, DOC, DOCX - Max 10MB each, up to 3 files)
          </p>
          
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-purple-200 hover:border-purple-400 hover:bg-purple-25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="file-upload-area"
          >
            <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-purple-800 font-medium">
                Drag and drop your medical documents here
              </p>
              <p className="text-sm text-purple-600">
                or
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.gif,.doc,.docx"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
                id="health-document-upload"
                data-testid="file-input"
              />
              <Button
                type="button"
                variant="outline"
                className="border-purple-500 text-purple-700 hover:bg-purple-50"
                onClick={() => document.getElementById('health-document-upload')?.click()}
                disabled={isLoading}
                data-testid="upload-button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </div>

          {/* Uploaded Documents List */}
          {healthDocumentUrls.length > 0 && (
            <div className="space-y-2">
              <Label className="text-purple-800 font-medium">Uploaded Documents:</Label>
              {healthDocumentUrls.map((url, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      Health Document {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-green-700 hover:bg-green-100"
                      onClick={() => window.open(url, '_blank')}
                      data-testid={`download-document-${index}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100"
                      onClick={() => onDocumentDelete(url)}
                      data-testid={`delete-document-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completion Status */}
        {hasRequiredInfo && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✨ <strong>Perfect! Your health profile is complete.</strong> You can now book yoga sessions with confidence.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}