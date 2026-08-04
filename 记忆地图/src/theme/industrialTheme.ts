// Industrial Realism & Minimalist Neumorphism Design Tokens
// Built strictly for Dieter Rams & Teenage Engineering OP-1 aesthetics:
// - Left-Top 45° double shadows (neumorphic physics engine)
// - Matte ABS plastic chassis (#e0e5ec) & injection-molded safety orange (#ff4757)
// - Ultra-clean Inter + JetBrains Mono typography, zero noise decoration

export const industrialColors = {
  // Chassis & Structural Layers
  chassis: '#e0e5ec',      // Level 0: Matte ABS plastic chassis base
  panel: '#f0f2f5',        // Level +1: Slightly elevated surface panel
  recessed: '#d1d9e6',     // Level -1: Recessed data slots, input fields, and screens
  darkPanel: '#2d3436',    // Dark technical panel background (for contrast areas)

  // Typography (High-contrast charcoal ink on matte plastic)
  textPrimary: '#2d3436',  // Deep charcoal ink (WCAG AAA/AA compliant)
  textMuted: '#4a5568',    // Deep slate gray for metadata, stamps, and technical labels
  textOnAccent: '#ffffff', // High-contrast white on safety orange

  // Injection-Molded Accents
  accent: '#ff4757',       // Safety Orange / Braun Red (Emergency stop / primary triggers)
  accentHover: '#e03e4d',  // Slightly deeper orange on hover/press

  // LED Status Colors
  ledGreen: '#22c55e',     // System Online / GPS Lock
  ledRed: '#ff4757',       // Active processing / Alert
  ledAmber: '#f59e0b',     // Standby / Analyzing

  // Neumorphic Shadow Pair (45° Top-Left Light Source)
  shadowDark: '#babecc',   // Bottom-Right shadow half
  shadowLight: '#ffffff',  // Top-Left highlight half
};

export const industrialRadii = {
  sm: 4,     // 4px: Tight mechanical edges (small buttons, technical badges)
  md: 8,     // 8px: Standard controls (recessed inputs, data slots)
  lg: 16,    // 16px: ABS panels, standard modules
  xl: 24,    // 24px: Large chassis enclosures and device frames
  pill: 9999,// 9999px: Perfect circle (LEDs, pill triggers, rotary controls)
};

export const industrialTypography = {
  hero: { fontFamily: 'Inter, sans-serif', fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  sectionTitle: { fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  cardTitle: { fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
  bodyLarge: { fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: '500' as const, lineHeight: 26 },
  body: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: '500' as const, lineHeight: 22 },
  mono: { fontFamily: '"JetBrains Mono", "Roboto Mono", monospace', fontSize: 13, fontWeight: '500' as const },
  labelMono: { fontFamily: '"JetBrains Mono", "Roboto Mono", monospace', fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2 },
};

// Neumorphic Double-Shadow Physics Stack (Left-Top 45° Light Source)
export const industrialShadows = {
  // Level +1: ABS Card / Bolted Module Panel
  card: {
    // @ts-ignore
    boxShadow: '8px 8px 16px #babecc, -8px -8px 16px #ffffff',
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  // Level +2: Floating Mechanical Controls / Raised Buttons
  floating: {
    // @ts-ignore
    boxShadow: '12px 12px 24px #babecc, -12px -12px 24px #ffffff, inset 1px 1px 0 rgba(255, 255, 255, 0.6)',
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  // Level -1: Pressed Active State (Mechanical Switch Squeeze)
  pressed: {
    // @ts-ignore
    boxShadow: 'inset 6px 6px 12px #babecc, inset -6px -6px 12px #ffffff',
    shadowColor: '#707c8c',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  // Level -1: Recessed Data Slots / Screen Borders / Inputs
  recessed: {
    // @ts-ignore
    boxShadow: 'inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff',
    shadowColor: '#8492a6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  // Safety Orange Injection Button Shadow Pair
  orangeButton: {
    // @ts-ignore
    boxShadow: '4px 4px 8px rgba(166, 50, 60, 0.4), -4px -4px 8px rgba(255, 100, 110, 0.4)',
    shadowColor: '#d63031',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  // LED Status Glow
  ledGreen: {
    // @ts-ignore
    boxShadow: '0 0 10px 2px rgba(34, 197, 94, 0.7)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  ledRed: {
    // @ts-ignore
    boxShadow: '0 0 10px 2px rgba(255, 71, 87, 0.7)',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
};
