import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth, getAuthHeaders } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Phone, Mail, Shield, AlertTriangle, Heart, CalendarDays } from 'lucide-react';
import Navigation from '@/components/navigation';
import { countryCodeOptions, validateMobileNumber, formatMobileNumber } from '@/lib/mobile-validation';
import { HealthUpdateSection } from '@/components/health-update-section';
import { SessionHistory } from '@/components/session-history';
import { MIN_HEALTH_UPDATE_CHARS } from '@/lib/profile-constants';
import { isAccountProfileComplete, type AccountProfileCheckInput } from '@shared/profileCompleteness';

// Health document file upload is disabled (product POV — see HealthUpdateSection.tsx).
// Previous implementation called POST /api/objects/upload and PUT /api/health-documents; restore when ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES is true in server/routes.ts.
//
// INTERNAL — SMS phone verify (Profile tab), not for end-user UI copy:
// Phone number verification (SMS) is turned off for now. We still collect your numbers and check the format here; the extra step of confirming each number by text message is a form of gatekeeping we will only turn on when we reach the scale and stage where we need it.
// Per-phone "Verify" buttons are omitted from the Profile form until then. Progress / context: replit.md → "Internal development notes".

function validateRequiredMobile(
  field: 'primaryMobile' | 'secondaryMobile' | 'emergencyMobile',
  digits: string,
  countryCode: string
): { isValid: boolean; error: string } {
  if (field === 'secondaryMobile' && !digits.trim()) {
    return { isValid: true, error: '' };
  }
  if (field !== 'secondaryMobile' && !digits.trim()) {
    return {
      isValid: false,
      error:
        field === 'primaryMobile'
          ? 'Primary mobile is required'
          : 'Emergency contact mobile is required',
    };
  }
  const v = validateMobileNumber(digits, countryCode);
  return { isValid: v.isValid, error: v.error ?? '' };
}

// Standard scroll function - aligns carousel end with header bottom (64px) across all devices
const scrollToSchedule = () => {
  const targetUrl = '/?openBooking=true';
  window.location.href = targetUrl;
};

export default function MyAccount() {
  const { user, updateProfile, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    primaryMobile: '',
    primaryMobileCountryCode: '+91',
    secondaryMobile: '',
    secondaryMobileCountryCode: '+91',
    emergencyMobile: '',
    emergencyMobileCountryCode: '+91',
    healthUpdateText: '',
    healthDocumentUrls: [] as string[],
  });

  const [mobileValidation, setMobileValidation] = useState({
    primaryMobile: { isValid: true, error: '' },
    secondaryMobile: { isValid: true, error: '' },
    emergencyMobile: { isValid: true, error: '' },
  });

  // Health update tab
  const [activeTab, setActiveTab] = useState('profile');

  // Health update handlers
  const handleHealthUpdateChange = (text: string) => {
    setProfileData(prev => ({ ...prev, healthUpdateText: text }));
  };

  // Wire health update to new API endpoint
  const handleHealthUpdateSave = async (healthData: { healthUpdateText: string; healthDocumentUrls: string[] }) => {
    if (!user?.id) return;

    const trimmed = healthData.healthUpdateText.trim();
    if (trimmed.length < MIN_HEALTH_UPDATE_CHARS) {
      toast({
        title: "Health update too short",
        description: `Please enter at least ${MIN_HEALTH_UPDATE_CHARS} characters (describe your situation or write that you have no current concerns).`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/health-update`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(healthData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to save health update');
      }

      await response.json().catch(() => ({}));

      setProfileData((prev) => ({
        ...prev,
        healthUpdateText: healthData.healthUpdateText,
        healthDocumentUrls: healthData.healthDocumentUrls,
      }));

      await refreshUser();

      toast({
        title: 'Health update saved',
      });
    } catch (error) {
      console.error('Health update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save health update",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      const next = {
        name: user.name || '',
        primaryMobile: user.primaryMobile || '',
        primaryMobileCountryCode: user.primaryMobileCountryCode || '+91',
        secondaryMobile: user.secondaryMobile || '',
        secondaryMobileCountryCode: user.secondaryMobileCountryCode || '+91',
        emergencyMobile: user.emergencyMobile || '',
        emergencyMobileCountryCode: user.emergencyMobileCountryCode || '+91',
        healthUpdateText: user.healthUpdateText || '',
        healthDocumentUrls: user.healthDocumentUrls || [],
      };
      setProfileData(next);
      setMobileValidation({
        primaryMobile: validateRequiredMobile(
          'primaryMobile',
          formatMobileNumber(next.primaryMobile),
          next.primaryMobileCountryCode
        ),
        secondaryMobile: validateRequiredMobile(
          'secondaryMobile',
          formatMobileNumber(next.secondaryMobile),
          next.secondaryMobileCountryCode
        ),
        emergencyMobile: validateRequiredMobile(
          'emergencyMobile',
          formatMobileNumber(next.emergencyMobile),
          next.emergencyMobileCountryCode
        ),
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    let nextValue = value;
    if (
      field.includes('Mobile') &&
      field !== 'primaryMobileCountryCode' &&
      field !== 'secondaryMobileCountryCode' &&
      field !== 'emergencyMobileCountryCode'
    ) {
      nextValue = formatMobileNumber(value);
    }

    setProfileData((prev) => {
      const next = { ...prev, [field]: nextValue };

      if (field === 'primaryMobile' || field === 'secondaryMobile' || field === 'emergencyMobile') {
        const ccKey =
          field === 'primaryMobile'
            ? 'primaryMobileCountryCode'
            : field === 'secondaryMobile'
              ? 'secondaryMobileCountryCode'
              : 'emergencyMobileCountryCode';
        const cc = next[ccKey as keyof typeof next] as string;
        const validation = validateRequiredMobile(
          field as 'primaryMobile' | 'secondaryMobile' | 'emergencyMobile',
          nextValue,
          cc
        );
        setMobileValidation((mv) => ({ ...mv, [field]: validation }));
      }

      return next;
    });
  };

  const handleCountryCodeChange = (field: string, value: string) => {
    setProfileData((prev) => {
      const next = { ...prev, [field]: value };
      const mobileField = field.replace('CountryCode', '') as
        | 'primaryMobile'
        | 'secondaryMobile'
        | 'emergencyMobile';
      const digits = formatMobileNumber((next[mobileField] as string) || '');
      const validation = validateRequiredMobile(mobileField, digits, value);
      setMobileValidation((mv) => ({ ...mv, [mobileField]: validation }));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profileData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
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

    // Validate mobile numbers
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

    if (profileData.healthUpdateText.trim().length < MIN_HEALTH_UPDATE_CHARS) {
      toast({
        title: "Health Update Required",
        description: `Please add at least ${MIN_HEALTH_UPDATE_CHARS} characters in the Health Update tab (e.g. current conditions or "No current concerns").`,
        variant: "destructive",
      });
      setActiveTab('health');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile(profileData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated!",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  const handleBookingClick = scrollToSchedule;

  const mergedForStatus: AccountProfileCheckInput = {
    emailVerified: Boolean(user?.emailVerified),
    name: profileData.name,
    primaryMobile: profileData.primaryMobile,
    primaryMobileCountryCode: profileData.primaryMobileCountryCode,
    secondaryMobile: profileData.secondaryMobile,
    secondaryMobileCountryCode: profileData.secondaryMobileCountryCode,
    emergencyMobile: profileData.emergencyMobile,
    emergencyMobileCountryCode: profileData.emergencyMobileCountryCode,
    healthUpdateText: profileData.healthUpdateText,
  };

  const isBookingReady = isAccountProfileComplete(mergedForStatus);

  const profileSubmitLabel = isBookingReady ? 'Update Profile' : 'Complete Profile';

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50">
      <Navigation onBookingClick={handleBookingClick} />
      
      {/* Account Page Content */}
      <div className="pt-24 md:pt-20 pb-20 md:pb-8 px-4">
        <div className="container mx-auto max-w-2xl">
          
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleGoHome}
              className="mb-4 text-primary hover:text-secondary"
              data-testid="back-to-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            
            <h1 className="text-3xl font-bold text-primary mb-2">My Account</h1>
            <p className="text-purple-600">Manage your profile and contact information</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Profile status:</span>
              <Badge
                variant={isBookingReady ? "default" : "secondary"}
                className={isBookingReady ? "bg-green-700 hover:bg-green-700" : "bg-amber-100 text-amber-900 hover:bg-amber-100"}
              >
                {isBookingReady ? "Complete" : "Incomplete"}
              </Badge>
            </div>
          </div>

          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                data-testid="profile-tab"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="health"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                data-testid="health-tab"
              >
                <Heart className="h-4 w-4 mr-2" />
                Health Update
              </TabsTrigger>
              <TabsTrigger 
                value="sessions"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                data-testid="sessions-tab"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Sessions
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" data-testid="profile-content">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-primary">Profile Information</CardTitle>
                      <CardDescription>Update your personal details and contact information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-primary font-bold">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                    data-testid="profile-name-input"
                  />
                </div>

                {/* Email Field (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-primary font-bold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    readOnly
                    className="bg-gray-50 text-gray-600"
                    data-testid="profile-email-display"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* Primary Mobile */}
                <div className="space-y-2">
                  <Label className="text-primary font-bold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Primary Mobile Number *
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={profileData.primaryMobileCountryCode}
                      onValueChange={(value) => handleCountryCodeChange('primaryMobileCountryCode', value)}
                    >
                      <SelectTrigger className="w-40" data-testid="primary-mobile-country-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.flag}</span>
                              <span className="text-xs">{option.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 relative">
                      <Input
                        type="tel"
                        value={profileData.primaryMobile}
                        onChange={(e) => handleInputChange('primaryMobile', e.target.value)}
                        placeholder="Enter mobile number"
                        className={`${!mobileValidation.primaryMobile.isValid ? 'border-red-500' : ''}`}
                        required
                        data-testid="primary-mobile-input"
                      />
                      {!mobileValidation.primaryMobile.isValid && (
                        <div className="absolute -bottom-5 left-0 text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {mobileValidation.primaryMobile.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Secondary Mobile */}
                <div className="space-y-2">
                  <Label className="text-primary font-bold">
                    Secondary Mobile Number (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={profileData.secondaryMobileCountryCode}
                      onValueChange={(value) => handleCountryCodeChange('secondaryMobileCountryCode', value)}
                    >
                      <SelectTrigger className="w-40" data-testid="secondary-mobile-country-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.flag}</span>
                              <span className="text-xs">{option.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 relative">
                      <Input
                        type="tel"
                        value={profileData.secondaryMobile}
                        onChange={(e) => handleInputChange('secondaryMobile', e.target.value)}
                        placeholder="Enter secondary mobile number"
                        className={`${!mobileValidation.secondaryMobile.isValid ? 'border-red-500' : ''}`}
                        data-testid="secondary-mobile-input"
                      />
                      {!mobileValidation.secondaryMobile.isValid && profileData.secondaryMobile && (
                        <div className="absolute -bottom-5 left-0 text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {mobileValidation.secondaryMobile.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Mobile */}
                <div className="space-y-2">
                  <Label className="text-primary font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Emergency Contact Mobile *
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={profileData.emergencyMobileCountryCode}
                      onValueChange={(value) => handleCountryCodeChange('emergencyMobileCountryCode', value)}
                    >
                      <SelectTrigger className="w-40" data-testid="emergency-mobile-country-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.flag}</span>
                              <span className="text-xs">{option.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 relative">
                      <Input
                        type="tel"
                        value={profileData.emergencyMobile}
                        onChange={(e) => handleInputChange('emergencyMobile', e.target.value)}
                        placeholder="Enter emergency contact number"
                        className={`${!mobileValidation.emergencyMobile.isValid ? 'border-red-500' : ''}`}
                        required
                        data-testid="emergency-mobile-input"
                      />
                      {!mobileValidation.emergencyMobile.isValid && (
                        <div className="absolute -bottom-5 left-0 text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {mobileValidation.emergencyMobile.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white px-8 py-4 rounded-full font-bold hover:bg-primary/90"
                    data-testid="update-profile-button"
                  >
                    {isLoading ? 'Updating...' : profileSubmitLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Account Actions</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-bold text-primary">Email Verification</h3>
                  <p className="text-sm text-gray-600">
                    {user.emailVerified ? 'Your email is verified' : 'Please verify your email address'}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user.emailVerified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.emailVerified ? 'Verified' : 'Pending'}
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={logout}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 px-8 py-4 rounded-full font-bold"
                data-testid="logout-button"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Health Update Tab */}
            <TabsContent value="health" data-testid="health-content">
              <HealthUpdateSection
                healthUpdateText={profileData.healthUpdateText}
                healthDocumentUrls={profileData.healthDocumentUrls}
                onHealthUpdateChange={handleHealthUpdateChange}
                onSave={handleHealthUpdateSave}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Session History Tab */}
            <TabsContent value="sessions" data-testid="sessions-content">
              <SessionHistory userId={user?.id || ''} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}