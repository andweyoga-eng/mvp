/** Digital Zen design tokens — source: design prototypes/andWeYOGa_handoff/DESIGN_SYSTEM.md */
export const dz = {
  colors: {
    surface: "#fbf9f7",
    surfaceContainerLow: "#f5f3f1",
    onSurface: "#1b1c1b",
    onSurfaceVariant: "#494550",
    primary: "#34196a",
    primaryContainer: "#4b3282",
    onPrimary: "#ffffff",
    secondary: "#9a4612",
    secondaryContainer: "#fd9259",
    tertiary: "#1b3120",
    error: "#ba1a1a",
    glassBorder: "rgba(75, 50, 130, 0.1)",
    glassSurface: "rgba(255, 255, 255, 0.7)",
  },
  layout: {
    containerMax: "1280px",
    headerHeight: 76,
    logoHeight: 48,
    iconButtonSize: 40,
  },
  radius: {
    card: "1.375rem",
    cardLg: "1.5rem",
    button: "0.75rem",
    pill: "9999px",
  },
  shadow: {
    ambient: "0 8px 30px rgba(27, 28, 27, 0.04)",
    primaryButton: "0 4px 14px rgba(52, 25, 106, 0.22)",
    heroCta: "0 10px 30px rgba(52, 25, 106, 0.4)",
  },
  fonts: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body: "'Onest', system-ui, sans-serif",
    accent: "'Instrument Serif', Georgia, serif",
  },
} as const;
