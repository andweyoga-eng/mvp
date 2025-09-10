# Overview

This is a full-stack yoga studio booking application built with React, Express.js, and PostgreSQL. The application allows users to browse yoga classes, view schedules, make bookings, and contact the studio. It features a modern responsive design with a complete booking system for yoga classes and instructors.

## Recent Changes (September 10, 2025)

### Milestone: Complete Dual Authentication System Implementation ✅ LOCKED
- **Gmail SMTP Authentication**: Implemented email/password registration with Gmail SMTP verification system
- **Google OAuth Integration**: Working Google OAuth sign-in with proper redirect URI configuration for Replit environment  
- **Authentication State Management**: Fixed OAuth token handling with proper AuthProvider integration
- **My Account Profile System**: Comprehensive profile management page with mobile number editing and verification
- **Advanced Mobile Validation**: Real-time validation with spam detection, length validation, and 40+ country codes
- **Mobile Verification System**: "Verify" buttons that change to "Verified ✓" status with simulated SMS verification
- **Navigation Integration**: "My Account" option in sandwich menu for logged-in users with sign-out functionality
- **Token Persistence**: Proper authentication state persistence across browser sessions and page reloads

### Milestone: Enhanced User Profile Management ✅ LOCKED
- **Multi-Mobile System**: Primary, secondary, and emergency mobile number fields with country code dropdowns
- **Country Code Support**: 40+ international country codes with flag icons and proper validation rules
- **Real-time Validation**: Instant feedback for mobile number formats, spam patterns, and length requirements  
- **Verification Status**: Visual verification system with green checkmarks and status indicators
- **Profile Updates**: Complete profile editing with validation and error handling
- **Responsive Design**: Mobile-optimized profile interface following design guidelines

### Milestone: Complete About Section & Story Section Implementation ✅ LOCKED
- **About Section Enhancements**: Increased logo size by 40% (h-16 md:h-20), updated button navigation to point correctly to instructor and story sections
- **New "and Our Story" Section**: Created comprehensive founder's transformation journey section featuring personal healing story (Sep 2022), community growth (Apr 2023), and philosophy "We meet, we greet, we do what we like, and we yoga too"
- **Hero Carousel Updates**: Updated Embrace slide text to "To embrace the journey of self-discovery and growth", applied gradient overlay to all slides including Become slide
- **Connect Section Icon Fixes**: Updated all icons to use primary purple brand color matching CTA buttons
- **Navigation Menu**: Added "and Our Story" entry and reordered menu items by character count ascending order
- **Code Quality**: All changes follow frozen design guidelines, maintained consistent purple branding throughout

### Milestone: Responsive Mobile Navigation Implementation ✅ LOCKED
- **Desktop/Tablet Navigation**: Header remains at top with sandwich menu, logo, and "Book Session" button
- **Mobile Navigation Layout**: Bottom navigation bar with sandwich menu (left), centered logo linked to "and We Teach", compact "Book" button (right)
- **Mobile Menu Expansion**: Menu slides up from bottom with full-width overlay, centered text alignment
- **Menu Item Ordering**: Exact sequence as specified - Care, Vibe, Teach, Story (orange), Believe, Connect, Meet Yogis
- **Responsive Carousel**: Starts from top edge on mobile (no header space), maintains top margin on desktop/tablet
- **Mobile UX Enhancements**: Proper z-index layering, touch-friendly interactions, overlay dismissal functionality

# User Preferences

Preferred communication style: Simple, everyday language.

## Design Guidelines (Frozen Standards)

### Typography
- **All fonts in headings, CTA buttons, and menu items must be BOLD** - This is a standard reference for current and all future development

### CTA Button Standards
- **All CTA buttons will be purple (#401e9c) background with white text** - This is frozen as the design guideline for now and all future development
- Buttons should use `font-bold` class
- Primary buttons: `bg-primary text-white px-8 py-4 rounded-full font-bold hover:bg-primary/90`
- Secondary buttons: `border-2 border-primary text-primary px-8 py-4 rounded-full font-bold hover:bg-primary hover:text-white`

### Menu Design Standards
- Menu items should have purple to orange hover transition effect
- Sandwich menu width optimized to 220px for clean appearance
- Menu items should use bold fonts
- Reduced spacing between menu items for better aesthetics

### Body Text Color Standards
- **All section body text must be purple color (text-purple-500, text-purple-600)** - This is a frozen design guideline for current and all future development
- Never use text-muted-foreground for section body text - always use purple variations
- This applies to all paragraph text, descriptions, and body content across all sections

### Carousel Gradient Standards
- **Hero carousel gradient specification (LOCKED)**: 
  - Direction: 135° (diagonal from top-left to bottom-right)
  - Purple: HSL(267, 84%, 40%) with 40% opacity
  - Orange: HSL(25, 95%, 60%) with 60% opacity
  - CSS Variables: `--yoga-purple: 267 84% 40%` and `--yoga-orange: 25 95% 60%`
  - Implementation: `--gradient-hero: linear-gradient(135deg, hsl(var(--yoga-purple) / 0.4), hsl(var(--yoga-orange) / 0.6))`
- **This gradient is frozen for all current and future development**
- Applied to: Hero carousel overlay, subtitle text backgrounds, and all gradient-overlay classes

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation resolvers

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API endpoints with proper HTTP status codes
- **Validation**: Zod schemas for request/response validation
- **Development**: Hot reloading with Vite integration in development mode

## Database Schema
The application uses PostgreSQL with the following main entities:
- **Users**: Complete user authentication and profile management with mobile numbers, country codes, and verification status
- **Class Types**: Different yoga class categories (Hatha, Vinyasa, etc.)
- **Instructors**: Instructor profiles with specialties and bio information
- **Classes**: Individual class sessions with date/time, capacity, and booking counts
- **Bookings**: Customer reservations for specific classes (requires authentication)
- **Contact Messages**: Customer inquiries and feedback

## Data Layer Design
- **Storage Interface**: Abstract storage interface (`IStorage`) for database operations
- **Type Safety**: Generated TypeScript types from Drizzle schema definitions
- **Validation**: Zod schemas for insert operations with proper error handling

## Authentication & Authorization
**Complete dual authentication system implemented with:**
- **Gmail SMTP Authentication**: Email/password registration with email verification via Gmail SMTP
- **Google OAuth Integration**: One-click Google sign-in with proper Replit environment configuration
- **Session Management**: JWT token-based authentication with localStorage persistence
- **Profile Management**: Comprehensive user profiles with mobile number validation and verification
- **Protected Routes**: Authentication requirements for booking sessions and profile access
- **Real-time Validation**: Advanced mobile number validation with country-specific rules and spam detection

## Component Architecture
- **Page-level Components**: Single-page application with modular sections
- **UI Components**: Reusable component library with consistent theming
- **Modal System**: Booking modal with form validation and API integration
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

# External Dependencies

## Database & ORM
- **PostgreSQL**: Primary database (configured for Neon Database hosting)
- **Drizzle ORM**: Type-safe database operations and migrations
- **Drizzle Kit**: Database migration and schema management tools

## UI & Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix UI

## State Management & API
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation for forms and API responses
- **Authentication Context**: Global authentication state management with AuthProvider
- **JWT Tokens**: Secure token-based authentication with localStorage persistence

## Development Tools
- **Vite**: Development server and build tooling with React plugin
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment specific plugins and tooling

## Asset Management
- **Static Assets**: Images stored in `attached_assets` directory
- **Font Loading**: Google Fonts integration for custom typography
- **Image Optimization**: Unsplash integration for placeholder images

The application is designed to be deployed on Replit with integrated development tooling and is configured for PostgreSQL hosting through Neon Database.

# Authentication System Implementation

## Core Authentication Features ✅ LOCKED
- **Dual Sign-in Methods**: Email/password registration with Gmail SMTP + Google OAuth integration
- **Email Verification**: Automated welcome emails with verification links via Gmail SMTP
- **Profile Management**: Complete user profile system with mobile number validation
- **Authentication Persistence**: JWT tokens with localStorage for session management
- **Protected Navigation**: Dynamic navigation menus based on authentication status

## Mobile Number Validation System ✅ LOCKED
- **Country Code Support**: 40+ international country codes with proper validation rules
- **Real-time Validation**: Instant spam detection, length validation, and format checking
- **Verification Workflow**: "Verify" buttons that change to "Verified ✓" status with green styling
- **Multi-Mobile Support**: Primary, secondary, and emergency contact numbers
- **Error Handling**: Clear validation messages with red borders and warning icons

## Key Authentication Files
- `client/src/components/auth-provider.tsx`: Global authentication state management
- `client/src/components/auth-modal.tsx`: Sign-in/sign-up modal with Google OAuth
- `client/src/pages/my-account.tsx`: Complete profile management interface  
- `client/src/lib/mobile-validation.ts`: Advanced mobile number validation logic
- `server/auth.ts`: JWT authentication middleware and email verification
- `server/googleAuth.ts`: Google OAuth configuration and token handling
- `shared/schema.ts`: User database schema with mobile number fields

## Security Features
- **JWT Token Validation**: Server-side token verification for protected routes
- **Email Verification**: Required email verification before account activation
- **Mobile Validation**: Advanced spam detection and country-specific format validation
- **OAuth Security**: Proper Google OAuth implementation with secure redirect handling
- **Session Management**: Secure token storage and automatic logout on token expiration