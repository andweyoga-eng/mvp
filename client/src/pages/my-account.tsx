import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Phone, Mail, Shield, Check, AlertTriangle } from 'lucide-react';
import Navigation from '@/components/navigation';
import { countryCodeOptions, validateMobileNumber, formatMobileNumber } from '@/lib/mobile-validation';

export default function MyAccount() {
  const { user, updateProfile, logout } = useAuth();
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
  });

  const [mobileValidation, setMobileValidation] = useState({
    primaryMobile: { isValid: true, error: '' },
    secondaryMobile: { isValid: true, error: '' },
    emergencyMobile: { isValid: true, error: '' },
  });

  const [mobileVerification, setMobileVerification] = useState({
    primaryMobile: false,
    secondaryMobile: false,
    emergencyMobile: false,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        primaryMobile: user.primaryMobile || '',
        primaryMobileCountryCode: user.primaryMobileCountryCode || '+91',
        secondaryMobile: user.secondaryMobile || '',
        secondaryMobileCountryCode: user.secondaryMobileCountryCode || '+91',
        emergencyMobile: user.emergencyMobile || '',
        emergencyMobileCountryCode: user.emergencyMobileCountryCode || '+91',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    // Format mobile numbers to only contain digits
    if (field.includes('Mobile') && field !== 'primaryMobileCountryCode' && field !== 'secondaryMobileCountryCode' && field !== 'emergencyMobileCountryCode') {
      value = formatMobileNumber(value);
    }

    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate mobile numbers in real-time
    if (field === 'primaryMobile' || field === 'secondaryMobile' || field === 'emergencyMobile') {
      const countryCodeField = field + 'CountryCode';
      const countryCode = profileData[countryCodeField as keyof typeof profileData] as string;
      const validation = validateMobileNumber(value, countryCode);
      
      setMobileValidation(prev => ({
        ...prev,
        [field]: validation
      }));
      
      // Reset verification status when number changes
      if (value !== (user as any)?.[field]) {
        setMobileVerification(prev => ({
          ...prev,
          [field]: false
        }));
      }
    }
  };

  const handleCountryCodeChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Re-validate mobile number with new country code
    const mobileField = field.replace('CountryCode', '');
    const mobileNumber = profileData[mobileField as keyof typeof profileData] as string;
    if (mobileNumber) {
      const validation = validateMobileNumber(mobileNumber, value);
      setMobileValidation(prev => ({
        ...prev,
        [mobileField]: validation
      }));
    }
  };

  const handleVerifyMobile = async (field: 'primaryMobile' | 'secondaryMobile' | 'emergencyMobile') => {
    // Mock verification - in real app this would send SMS and verify
    toast({
      title: "Verification Sent",
      description: `A verification code has been sent to your ${field.replace('Mobile', '').toLowerCase()} mobile number.`,
    });
    
    // Simulate verification after 2 seconds
    setTimeout(() => {
      setMobileVerification(prev => ({
        ...prev,
        [field]: true
      }));
      toast({
        title: "Mobile Verified",
        description: `Your ${field.replace('Mobile', '').toLowerCase()} mobile number has been verified successfully.`,
      });
    }, 2000);
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

  const handleBookingClick = () => {
    setLocation('/?openBooking=true');
  };

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
          </div>

          {/* Profile Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-primary">Profile Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
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
                    <Button
                      type="button"
                      onClick={() => handleVerifyMobile('primaryMobile')}
                      disabled={!profileData.primaryMobile || !mobileValidation.primaryMobile.isValid || mobileVerification.primaryMobile}
                      variant={mobileVerification.primaryMobile ? "outline" : "default"}
                      className={`px-4 py-2 text-sm font-bold ${
                        mobileVerification.primaryMobile 
                          ? 'border-green-500 text-green-600 bg-green-50' 
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      data-testid="verify-primary-mobile"
                    >
                      {mobileVerification.primaryMobile ? (
                        <><Check className="h-4 w-4 mr-1" />Verified</>
                      ) : (
                        'Verify'
                      )}
                    </Button>
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
                    <Button
                      type="button"
                      onClick={() => handleVerifyMobile('secondaryMobile')}
                      disabled={!profileData.secondaryMobile || !mobileValidation.secondaryMobile.isValid || mobileVerification.secondaryMobile}
                      variant={mobileVerification.secondaryMobile ? "outline" : "default"}
                      className={`px-4 py-2 text-sm font-bold ${
                        mobileVerification.secondaryMobile 
                          ? 'border-green-500 text-green-600 bg-green-50' 
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      data-testid="verify-secondary-mobile"
                    >
                      {mobileVerification.secondaryMobile ? (
                        <><Check className="h-4 w-4 mr-1" />Verified</>
                      ) : (
                        'Verify'
                      )}
                    </Button>
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
                    <Button
                      type="button"
                      onClick={() => handleVerifyMobile('emergencyMobile')}
                      disabled={!profileData.emergencyMobile || !mobileValidation.emergencyMobile.isValid || mobileVerification.emergencyMobile}
                      variant={mobileVerification.emergencyMobile ? "outline" : "default"}
                      className={`px-4 py-2 text-sm font-bold ${
                        mobileVerification.emergencyMobile 
                          ? 'border-green-500 text-green-600 bg-green-50' 
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      data-testid="verify-emergency-mobile"
                    >
                      {mobileVerification.emergencyMobile ? (
                        <><Check className="h-4 w-4 mr-1" />Verified</>
                      ) : (
                        'Verify'
                      )}
                    </Button>
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
                    {isLoading ? 'Updating...' : 'Update Profile'}
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
        </div>
      </div>
    </div>
  );
}