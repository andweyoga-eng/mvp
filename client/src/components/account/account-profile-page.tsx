import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Shield, User } from "lucide-react";
import { ProfilePhoneField } from "@/components/profile-phone-field";
import { AccountStickyActions } from "@/components/account/account-sticky-actions";
import { useAccount } from "@/components/account/account-context";

export function AccountProfilePage() {
  const {
    user,
    isLoading,
    profileData,
    mobileValidation,
    profileSubmitLabel,
    handleInputChange,
    handleCountryCodeChange,
    handleProfileSubmit,
    logout,
  } = useAccount();

  return (
    <div data-testid="profile-content">
      <Card className="mb-6 border-0 shadow-md md:border md:shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-primary">Profile Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form id="account-profile-form" onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold text-primary">
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your full name"
                required
                data-testid="profile-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 font-bold text-primary">
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

            <ProfilePhoneField
              label={
                <>
                  <Phone className="h-4 w-4" />
                  Primary Mobile Number *
                </>
              }
              countryCode={profileData.primaryMobileCountryCode}
              onCountryCodeChange={(value) =>
                handleCountryCodeChange("primaryMobileCountryCode", value)
              }
              mobile={profileData.primaryMobile}
              onMobileChange={(value) => handleInputChange("primaryMobile", value)}
              placeholder="Mobile number"
              validation={mobileValidation.primaryMobile}
              countrySelectTestId="primary-mobile-country-select"
              mobileInputTestId="primary-mobile-input"
              required
            />

            <ProfilePhoneField
              label="Secondary Mobile Number (Optional)"
              countryCode={profileData.secondaryMobileCountryCode}
              onCountryCodeChange={(value) =>
                handleCountryCodeChange("secondaryMobileCountryCode", value)
              }
              mobile={profileData.secondaryMobile}
              onMobileChange={(value) => handleInputChange("secondaryMobile", value)}
              placeholder="Secondary number"
              validation={mobileValidation.secondaryMobile}
              showError={Boolean(profileData.secondaryMobile)}
              countrySelectTestId="secondary-mobile-country-select"
              mobileInputTestId="secondary-mobile-input"
            />

            <ProfilePhoneField
              label={
                <>
                  <Shield className="h-4 w-4" />
                  Emergency Contact Mobile *
                </>
              }
              countryCode={profileData.emergencyMobileCountryCode}
              onCountryCodeChange={(value) =>
                handleCountryCodeChange("emergencyMobileCountryCode", value)
              }
              mobile={profileData.emergencyMobile}
              onMobileChange={(value) => handleInputChange("emergencyMobile", value)}
              placeholder="Emergency number"
              validation={mobileValidation.emergencyMobile}
              countrySelectTestId="emergency-mobile-country-select"
              mobileInputTestId="emergency-mobile-input"
              required
            />

            <div className="hidden md:block md:pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-full bg-primary px-8 font-bold text-white hover:bg-primary/90"
                data-testid="update-profile-button"
              >
                {isLoading ? "Updating..." : profileSubmitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 border-0 shadow-md md:border md:shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary">Account Actions</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-bold text-primary">Email Verification</h3>
              <p className="text-sm text-gray-600">
                {user.emailVerified ? "Your email is verified" : "Please verify your email address"}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                user.emailVerified
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {user.emailVerified ? "Verified" : "Pending"}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={logout}
            className="w-full rounded-full border-red-200 px-8 py-4 font-bold text-red-600 hover:bg-red-50"
            data-testid="logout-button"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <AccountStickyActions className="md:hidden">
        <Button
          type="submit"
          form="account-profile-form"
          disabled={isLoading}
          className="h-12 w-full rounded-full bg-primary font-bold text-white hover:bg-primary/90"
          data-testid="update-profile-button-mobile"
        >
          {isLoading ? "Updating..." : profileSubmitLabel}
        </Button>
      </AccountStickyActions>
    </div>
  );
}
