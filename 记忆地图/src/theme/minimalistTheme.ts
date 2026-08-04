// Minimalist UI Design Tokens
// Clean editorial-style interfaces. Warm monochrome palette, high typographic contrast.
// Flat surfaces, no heavy shadows, pastel or muted accents.

export const minimalistColors = {
  // Backgrounds & Surfaces
  background: '#fafafa',   // Off-white minimal background
  surface: '#ffffff',      // Pure white card surfaces
  surfaceOverlay: 'rgba(255, 255, 255, 0.85)', // Blur fallback

  // Typography
  textPrimary: '#111111',  // Deep charcoal/black
  textSecondary: '#666666',// Muted gray for subtitles
  textMuted: '#999999',    // Very subtle text

  // Accents (Muted / Pure)
  accent: '#111111',       // Primary action is pure black (high contrast minimalism)
  textOnAccent: '#ffffff', // White on black
  
  // States
  border: '#eaeaea',       // Very subtle dividers
  error: '#e74c3c',
  success: '#2ecc71',
};

export const minimalistRadii = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 9999, // Pills and circles
};

export const minimalistTypography = {
  title: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  headline: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  subhead: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, fontWeight: '500' as const },
  body: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 12, fontWeight: '400' as const, color: minimalistColors.textSecondary },
};

// Minimal shadows - mostly flat, using borders or extremely subtle drop shadows
export const minimalistShadows = {
  card: {
    // @ts-ignore
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    // @ts-ignore
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  none: {
    // @ts-ignore
    boxShadow: 'none',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  }
};
