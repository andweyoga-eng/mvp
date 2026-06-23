import { useState } from "react";
import { LogOut, Settings, AlertTriangle, Sparkles, ChevronDown, Calendar } from "lucide-react";
import { usePaymentVerifiedCelebrations } from "@/components/payment-verified-provider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { AuthChoiceDialog } from "@/components/auth-hover-popup";
import { useToast } from "@/hooks/use-toast";
import { isAuthUserProfileComplete } from "@/lib/account-profile-complete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navigateToHomeSection } from "@/lib/home-navigation";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

interface NavigationProps {
  onBookingClick: () => void;
}

export default function Navigation({ onBookingClick }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bookingAuthOpen, setBookingAuthOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { celebrationCount, openCelebrationFromMenu } = usePaymentVerifiedCelebrations();

  const isProfileComplete = isAuthUserProfileComplete(user);

  const handleBookingClick = () => {
    onBookingClick();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const goToHomeSection = (sectionId: string) => {
    navigateToHomeSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
    {/* Unified Navigation - All Devices */}
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 relative">
          {/* AWY Menu Trigger - Leftmost corner */}
          <div className="flex-shrink-0 relative">
            <Button
              className="bg-primary hover:bg-primary/90 !text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-2.5 rounded-full transition-all duration-200 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              onClick={toggleMobileMenu}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? "Close" : "AWY"}
            </Button>
            {user && celebrationCount > 0 && (
              <button
                type="button"
                className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#bb5309] to-[#3d1b80] px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-white animate-pulse"
                aria-label="Session starting soon — open join prompt"
                data-testid="payment-verified-menu-bubble"
                onClick={(e) => {
                  e.stopPropagation();
                  openCelebrationFromMenu();
                }}
              >
                {celebrationCount > 1 ? celebrationCount : <Sparkles className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Logo - Center with responsive sizing */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                goToHomeSection("home");
              }}
              className="inline-block"
              data-testid="desktop-logo-link"
              aria-label="andWeYoga home"
            >
              <img 
                src={logoPath} 
                alt="andWeYoga" 
                className="h-10 sm:h-12 md:h-14 w-auto max-w-[120px] sm:max-w-none hover:opacity-80 transition-opacity duration-200"
                data-testid="logo"
              />
            </a>
          </div>

          {/* Primary actions - Right side */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={`${!isProfileComplete ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'} !text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-2.5 rounded-full transition-all duration-200 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105`}
                    data-testid="nav-my-account"
                  >
                    {!isProfileComplete && (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    My Account
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBookingClick} data-testid="nav-dropdown-book-session">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Session
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/account')} data-testid="nav-dropdown-my-account">
                    <Settings className="w-4 h-4 mr-2" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 focus:text-red-700"
                    data-testid="nav-dropdown-sign-out"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  className="bg-primary hover:bg-primary/90 !text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-2.5 rounded-full transition-all duration-200 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="nav-book-session"
                  onClick={() => setBookingAuthOpen(true)}
                >
                  Book Session
                </Button>
                <AuthChoiceDialog
                  open={bookingAuthOpen}
                  onOpenChange={setBookingAuthOpen}
                  onContinueAsGuest={handleBookingClick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Mobile Navigation Menu */}
      <div 
        className={`fixed top-16 left-0 z-50 bg-white border-r border-b border-border shadow-2xl transition-all duration-300 ease-in-out mobile-nav-menu ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        style={{ width: '220px' }}
        onMouseLeave={() => setIsMobileMenuOpen(false)}
      >
        <div className="px-6 py-6 md:space-y-3 space-y-4 text-center md:text-left">
          <button 
            onClick={() => goToHomeSection('care')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-care"
          >
            and We Care
          </button>
          <button 
            onClick={() => goToHomeSection('vibe')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-vibe"
          >
            and We Vibe
          </button>
          <button 
            onClick={() => goToHomeSection('teach')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-teach"
          >
            and We Teach
          </button>
          <button 
            onClick={() => goToHomeSection('story')}
            className="block w-full md:text-left text-center text-base font-bold text-secondary hover:text-primary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-story"
          >
            and Our Story
          </button>
          <button 
            onClick={() => goToHomeSection('believe')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-believe"
          >
            and We Believe
          </button>
          <button 
            onClick={() => goToHomeSection('connect')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-connect"
          >
            and We Connect
          </button>
          <button 
            onClick={() => goToHomeSection('ally')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-ally"
          >
            and We Meet Yogis
          </button>
          {user && celebrationCount > 0 && (
            <div className="pt-4 border-t border-border/30">
              <Button
                onClick={() => {
                  openCelebrationFromMenu();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-[#3d1b80] to-[#bb5309] !text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:opacity-95"
                data-testid="mobile-nav-payment-verified"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Join your session
                <Badge className="ml-2 bg-white/20 text-white border-0">{celebrationCount}</Badge>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Unified Overlay when menu is open */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          data-testid="menu-overlay"
        />
      )}
    </nav>
    </>
  );
}
