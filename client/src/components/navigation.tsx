import { useState } from "react";
import { Menu, X, User, LogOut, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/auth-modal";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

interface NavigationProps {
  onBookingClick: () => void;
}

export default function Navigation({ onBookingClick }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
    {/* Mobile Header - Top with 60% transparent white background and centered logo */}
    <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16">
          <button 
            onClick={() => scrollToSection('teach')}
            data-testid="mobile-header-logo-link"
          >
            <img 
              src={logoPath} 
              alt="andWeYoga" 
              className="h-12 w-auto max-w-[140px]"
              data-testid="mobile-header-logo"
            />
          </button>
        </div>
      </div>
    </nav>

    {/* Desktop/Tablet Navigation - Top */}
    <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 relative">
          {/* Sandwich Menu Button - Leftmost corner */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5 sm:p-2 hover:bg-muted transition-colors"
              onClick={toggleMobileMenu}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              ) : (
                <Menu className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              )}
            </Button>
          </div>

          {/* Logo - Center with responsive sizing */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0">
            <button 
              onClick={() => scrollToSection('teach')}
              data-testid="desktop-logo-link"
            >
              <img 
                src={logoPath} 
                alt="andWeYoga" 
                className="h-10 sm:h-12 md:h-14 w-auto max-w-[120px] sm:max-w-none hover:opacity-80 transition-opacity duration-200"
                data-testid="logo"
              />
            </button>
          </div>

          {/* Book Session Button - Right side */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {user && (
              <span className="text-sm text-purple-600 font-medium hidden lg:inline">
                {user.name}
              </span>
            )}
            <Button 
              onClick={onBookingClick}
              className="bg-primary text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-2.5 rounded-full hover:bg-primary/90 transition-all duration-200 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              data-testid="nav-book-session"
            >
              <span className="hidden sm:inline">Book Session</span>
              <span className="sm:hidden">Book</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Mobile Navigation Menu */}
      <div 
        className={`hidden md:block fixed top-16 left-0 z-40 bg-white border-r border-b border-border shadow-2xl transition-all duration-300 ease-in-out mobile-nav-menu ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        style={{ width: '220px' }}
        onMouseLeave={() => setIsMobileMenuOpen(false)}
      >
        <div className="px-6 py-6 md:space-y-3 space-y-4 text-center md:text-left">
          <button 
            onClick={() => scrollToSection('care')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-care"
          >
            and We Care
          </button>
          <button 
            onClick={() => scrollToSection('vibe')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-vibe"
          >
            and We Vibe
          </button>
          <button 
            onClick={() => scrollToSection('teach')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-teach"
          >
            and We Teach
          </button>
          <button 
            onClick={() => scrollToSection('story')}
            className="block w-full md:text-left text-center text-base font-bold text-secondary hover:text-primary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-story"
          >
            and Our Story
          </button>
          <button 
            onClick={() => scrollToSection('believe')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-believe"
          >
            and We Believe
          </button>
          <button 
            onClick={() => scrollToSection('connect')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-connect"
          >
            and We Connect
          </button>
          <button 
            onClick={() => scrollToSection('ally')}
            className="block w-full md:text-left text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 md:hover:translate-x-1 py-1.5"
            data-testid="mobile-nav-ally"
          >
            and We Meet Yogis
          </button>
          <div className="pt-4 border-t border-border/30 space-y-2">
            {user ? (
              <>
                <p className="text-sm text-purple-600 font-bold text-center">
                  Welcome, {user.name}!
                </p>
                <Button 
                  onClick={() => {
                    setLocation('/my-account');
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10 px-6 py-3 rounded-full text-sm font-bold"
                  data-testid="mobile-nav-my-account"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  My Account
                </Button>
                <Button 
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 px-6 py-3 rounded-full text-sm font-bold"
                  data-testid="mobile-nav-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => {
                  setShowAuthModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-primary text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-primary/90"
                data-testid="mobile-nav-sign-in-up"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Desktop Overlay when menu is open */}
      {isMobileMenuOpen && (
        <div 
          className="hidden md:block fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          data-testid="mobile-menu-overlay"
        />
      )}
    </nav>
    
    {/* Mobile Navigation Menu */}
    <div 
      className={`md:hidden fixed left-0 right-0 bottom-16 z-40 bg-white border-t border-border shadow-2xl transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
    >
      <div className="px-6 py-6 space-y-4 text-center">
        <button 
          onClick={() => scrollToSection('care')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-care"
        >
          and We Care
        </button>
        <button 
          onClick={() => scrollToSection('vibe')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-vibe"
        >
          and We Vibe
        </button>
        <button 
          onClick={() => scrollToSection('teach')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-teach"
        >
          and We Teach
        </button>
        <button 
          onClick={() => scrollToSection('story')}
          className="block w-full text-center text-base font-bold text-secondary hover:text-primary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-story"
        >
          and Our Story
        </button>
        <button 
          onClick={() => scrollToSection('believe')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-believe"
        >
          and We Believe
        </button>
        <button 
          onClick={() => scrollToSection('connect')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-connect"
        >
          and We Connect
        </button>
        <button 
          onClick={() => scrollToSection('ally')}
          className="block w-full text-center text-base font-bold text-primary hover:text-secondary transition-all duration-200 py-1.5"
          data-testid="mobile-nav-ally"
        >
          and We Meet Yogis
        </button>
        <div className="pt-4 border-t border-border/30 space-y-2">
          {user ? (
            <>
              <p className="text-sm text-purple-600 font-bold text-center">
                Welcome, {user.name}!
              </p>
              <Button 
                onClick={() => {
                  setLocation('/my-account');
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10 px-6 py-3 rounded-full text-sm font-bold"
                data-testid="mobile-nav-my-account"
              >
                <Settings className="h-4 w-4 mr-2" />
                My Account
              </Button>
              <Button 
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 px-6 py-3 rounded-full text-sm font-bold"
                data-testid="mobile-nav-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                setShowAuthModal(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full bg-primary text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-primary/90"
              data-testid="mobile-nav-sign-in-up"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </div>
    </div>
    
    {/* Mobile Overlay when menu is open */}
    {isMobileMenuOpen && (
      <div 
        className="md:hidden fixed inset-0 bottom-16 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
        onClick={() => setIsMobileMenuOpen(false)}
        data-testid="mobile-menu-overlay"
      />
    )}
    
    {/* Mobile Navigation - Bottom */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-between h-16">
          {/* Sandwich Menu Button - Left */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-muted transition-colors"
              onClick={toggleMobileMenu}
              data-testid="mobile-menu-toggle-bottom"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-primary" />
              ) : (
                <Menu className="h-6 w-6 text-primary" />
              )}
            </Button>
          </div>

          {/* Spacer - No logo in bottom nav anymore */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            {/* Logo moved to top header */}
          </div>

          {/* Book Session Button - Right */}
          <div className="flex-shrink-0">
            <Button 
              onClick={onBookingClick}
              className="bg-primary text-white px-3 py-2 rounded-full hover:bg-primary/90 transition-all duration-200 text-xs font-bold shadow-lg"
              data-testid="nav-book-session-mobile"
            >
              Book
            </Button>
          </div>
        </div>
      </div>
    </nav>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultTab="login"
      />
    </>
  );
}
