---
name: Digital Zen
colors:
  surface: '#fbf9f7'
  surface-dim: '#dbdad8'
  surface-bright: '#fbf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f1'
  surface-container: '#efedec'
  surface-container-high: '#eae8e6'
  surface-container-highest: '#e4e2e0'
  on-surface: '#1b1c1b'
  on-surface-variant: '#494550'
  inverse-surface: '#30302f'
  inverse-on-surface: '#f2f0ee'
  outline: '#7a7581'
  outline-variant: '#cbc4d2'
  surface-tint: '#6850a1'
  primary: '#34196a'
  on-primary: '#ffffff'
  primary-container: '#4b3282'
  on-primary-container: '#baa0f8'
  inverse-primary: '#d1bcff'
  secondary: '#9a4612'
  on-secondary: '#ffffff'
  secondary-container: '#fd9259'
  on-secondary-container: '#712d00'
  tertiary: '#1b3120'
  on-tertiary: '#ffffff'
  tertiary-container: '#314736'
  on-tertiary-container: '#9cb59e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d1bcff'
  on-primary-fixed: '#24015a'
  on-primary-fixed-variant: '#503787'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb692'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#793000'
  tertiary-fixed: '#cfe9d1'
  tertiary-fixed-dim: '#b3cdb6'
  on-tertiary-fixed: '#0a2011'
  on-tertiary-fixed-variant: '#354c3a'
  background: '#fbf9f7'
  on-background: '#1b1c1b'
  surface-variant: '#e4e2e0'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system embodies the "Digital Zen" philosophy, bridging the gap between high-performance wellness and soft, approachable minimalism. The brand personality is serene, professional, and expansive, designed to feel like a digital sanctuary for yoga practitioners and instructors alike.

The visual style is a sophisticated blend of **Soft Minimalism** and **Glassmorphism**. It utilizes generous white space (Prana) to allow content to breathe, paired with translucent, frosted-glass surfaces that suggest depth without clutter. Organic, flowing shapes—inspired by the movement of breath and physical asanas—are used as decorative backdrops and containers to break the rigidity of standard digital grids.

The target audience ranges from students seeking mindful movement to professional instructors managing complex schedules. The UI must feel effortless, reducing cognitive load through clear hierarchy and a "calm-tech" aesthetic that prioritizes high-quality, human-centric photography.

## Colors

The palette is rooted in a deep, meditative purple that provides a sense of authority and grounding. This is balanced by organic accent tones that reflect the physical world of wellness.

- **Deep Purple (Primary):** Used for primary actions, branding, and active states. It represents the crown chakra and deep focus.
- **Soft Terracotta (Secondary):** Derived from the logo, used for highlights, secondary call-to-actions, and energy-focused elements.
- **Sage Green (Tertiary):** A calming, natural tone used for success states, health metrics, and nature-oriented workshops.
- **Airy Neutrals:** A range of off-whites and warm grays that prevent the UI from feeling "clinical," maintaining a soft, organic warmth.

The interface defaults to a light mode to maximize the "airy" feel, utilizing a tinted neutral background to reduce eye strain.

## Typography

Typography is clean and modern, prioritizing legibility and a welcoming character. 

**Plus Jakarta Sans** is used for headlines. Its soft, slightly rounded geometric forms mirror the organic aesthetic of the brand. It should be used for all display and heading roles to inject personality.

**Inter** serves as the workhorse for body text and functional labels. Its high x-height and neutral design ensure maximum readability across various device densities, especially when viewing densly populated instructor dashboards or class schedules.

For mobile, headlines are scaled down slightly to maintain balance, while body text remains large and legible to facilitate use during physical activities.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy with fixed horizontal margins on larger screens. A 12-column grid is used for desktop, 8-column for tablet, and 4-column for mobile.

**Bento Grid Dashboards:** To organize multi-role information (Students/Instructors), use a modular "Bento" layout. Elements are grouped into tiles of varying sizes that snap to the grid, creating a tidy yet dynamic visual organization.

**Spacing Rhythm:**
- Use `xl` (40px) or `xxl` (64px) for section vertical spacing to create the "airy" feel.
- Internal card padding should be `lg` (24px).
- Safe margins for mobile are set at `md` (16px).

## Elevation & Depth

Depth is achieved through **Glassmorphism** and **Tonal Layering** rather than heavy shadows.

1.  **Base Layer:** The background is a solid off-white or very light beige.
2.  **Surface Layer:** Cards and dashboard modules use a semi-transparent white background (`rgba(255, 255, 255, 0.7)`) with a `20px` backdrop-blur. 
3.  **Outlines:** Instead of traditional shadows, use a `1px` stroke in a very low-opacity primary color (`rgba(75, 50, 130, 0.1)`) to define card boundaries.
4.  **Active Elevation:** When a user interacts with a card (hover/focus), a very soft, diffused ambient shadow is added: `0 8px 30px rgba(0, 0, 0, 0.04)`.

This creates a "floating" effect that feels light and modern, echoing the weightlessness of a meditative state.

## Shapes

The shape language is primarily **Rounded**, moving toward organic curves. 

Standard components (Cards, Input Fields) use a 0.5rem (8px) radius. Larger container modules and bento tiles should utilize `rounded-xl` (1.5rem / 24px) to emphasize the soft, modern aesthetic. 

**Organic Blobs:** Use large, low-opacity organic SVG shapes in the background (Sage or Terracotta) to break the linear nature of the grid. These shapes should be fluid and asymmetrical.

## Components

**Buttons:** 
- Primary buttons are solid Deep Purple with white text, using `rounded-lg`.
- Secondary buttons use the Glassmorphism style: translucent white with a purple border.

**Switch Pattern Toggle:** 
- A prominent, pill-shaped toggle at the top of the navigation or profile section. 
- It uses clear iconography (e.g., a Lotus for Student, a Whistle/Teacher icon for Instructor) and a sliding physical animation to transition between roles.

**Bio-centric Profile Cards:**
- These feature large, circular or organic-clipped imagery of the instructor.
- Information is stacked vertically with high-contrast labels and a "Soft Terracotta" accent for key stats (e.g., "1k+ Students").

**Tabs:**
- Use "Elegant Tabs" which are underline-only or soft-pill background indicators. They should have a subtle horizontal scroll on mobile to accommodate many categories.

**Input Fields:**
- Minimalist design with only a bottom border or a very light background tint. Focus states should transition the border to the primary Deep Purple.

**Chips:**
- Small, pill-shaped tags used for class categories (e.g., "Vinyasa", "Hatha"). Use low-saturation background tints of Sage Green or Terracotta.