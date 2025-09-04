# Overview

This is a full-stack yoga studio booking application built with React, Express.js, and PostgreSQL. The application allows users to browse yoga classes, view schedules, make bookings, and contact the studio. It features a modern responsive design with a complete booking system for yoga classes and instructors.

## Recent Changes (September 4, 2025)

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
- **Users**: Authentication and user management
- **Class Types**: Different yoga class categories (Hatha, Vinyasa, etc.)
- **Instructors**: Instructor profiles with specialties and bio information
- **Classes**: Individual class sessions with date/time, capacity, and booking counts
- **Bookings**: Customer reservations for specific classes
- **Contact Messages**: Customer inquiries and feedback

## Data Layer Design
- **Storage Interface**: Abstract storage interface (`IStorage`) for database operations
- **Type Safety**: Generated TypeScript types from Drizzle schema definitions
- **Validation**: Zod schemas for insert operations with proper error handling

## Authentication & Authorization
The application includes user management infrastructure but appears to focus primarily on public booking functionality without complex authentication flows.

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