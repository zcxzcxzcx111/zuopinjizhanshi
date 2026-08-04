// High-Fidelity Claymorphism (Digital Clay) Design Tokens
// Built specifically for warm, tactile, buoyant digital clay interfaces

export const clayColors = {
  // Canvas & Backgrounds
  canvas: '#F4F1FA',           // Very light cool lavender white (never pure white)
  cardBg: 'rgba(255, 255, 255, 0.82)', // Glass clay translucent white
  inputBg: '#EFEBF5',          // Recessed surface background

  // Text Hierarchy (High contrast, warm charcoal/slate)
  textPrimary: '#332F3A',      // Soft charcoal (WCAG AA compliant)
  textSecondary: '#635F69',    // Deep lavender gray (never lighter than this)
  textOnAccent: '#FFFFFF',

  // Candy Store Accents
  accent: '#7C3AED',           // Vibrant purple (primary action)
  accentAlt: '#DB2777',        // Bright pink (gradient & highlights)
  sky: '#0EA5E9',              // Sky blue (info & floating blobs)
  emerald: '#10B981',          // Emerald green (success & active badges)
  amber: '#F59E0B',            // Amber orange (warnings & stars)

  // Gradients (CSS string for Web / helpers)
  btnGradientStart: '#A78BFA',
  btnGradientEnd: '#7C3AED',
  btnGradientCss: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
};

export const clayRadii = {
  container: 48,  // rounded-[48px] for hero/modal containers
  card: 32,       // rounded-[32px] for standard cards
  inner: 24,      // rounded-[24px] for nested elements/images inside cards
  button: 20,     // rounded-[20px] for buttons
  input: 16,      // rounded-2xl for inputs
  pill: 100,      // rounded-full for pills and spheres
};

export const clayTypography = {
  hero: { fontFamily: 'Nunito, sans-serif', fontSize: 48, fontWeight: '900' as const, lineHeight: 54 },
  sectionTitle: { fontFamily: 'Nunito, sans-serif', fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  cardTitle: { fontFamily: 'Nunito, sans-serif', fontSize: 22, fontWeight: '800' as const, lineHeight: 28 },
  bodyLarge: { fontFamily: '"DM Sans", sans-serif', fontSize: 18, fontWeight: '500' as const, lineHeight: 28 },
  body: { fontFamily: '"DM Sans", sans-serif', fontSize: 16, fontWeight: '500' as const, lineHeight: 26 },
  subhead: { fontFamily: '"DM Sans", sans-serif', fontSize: 14, fontWeight: '700' as const, lineHeight: 20 },
  caption: { fontFamily: '"DM Sans", sans-serif', fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.5 },
};

// High-Fidelity 4-Layer Multi-Shadow Stack
export const clayShadows = {
  // 1. Deep Clay Surface (for primary containers / modals)
  surface: {
    // @ts-ignore - Web exact 4-layer shadow stack
    boxShadow: '30px 30px 60px #cdc6d9, -30px -30px 60px #ffffff, inset 10px 10px 20px rgba(139, 92, 246, 0.05), inset -10px -10px 20px rgba(255, 255, 255, 0.8)',
    shadowColor: '#A096B4',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  // 2. Clay Card (floating buoy content card)
  card: {
    // @ts-ignore
    boxShadow: '16px 16px 32px rgba(160, 150, 180, 0.22), -10px -10px 24px rgba(255, 255, 255, 0.92), inset 6px 6px 12px rgba(139, 92, 246, 0.03), inset -6px -6px 12px rgba(255, 255, 255, 1)',
    shadowColor: '#A096B4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  // 3. Clay Button (highly convex interactive CTA)
  button: {
    // @ts-ignore
    boxShadow: '12px 12px 24px rgba(139, 92, 246, 0.32), -8px -8px 16px rgba(255, 255, 255, 0.45), inset 4px 4px 8px rgba(255, 255, 255, 0.45), inset -4px -4px 8px rgba(0, 0, 0, 0.15)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  // 4. Clay Button Hover (enhanced lift)
  buttonHover: {
    // @ts-ignore
    boxShadow: '16px 16px 28px rgba(139, 92, 246, 0.42), -10px -10px 20px rgba(255, 255, 255, 0.6), inset 4px 4px 8px rgba(255, 255, 255, 0.55), inset -4px -4px 8px rgba(0, 0, 0, 0.18)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  // 5. Clay Pressed (indented / active squeeze state)
  pressed: {
    // @ts-ignore
    boxShadow: 'inset 8px 8px 16px #d9d4e3, inset -8px -8px 16px #ffffff',
    shadowColor: '#888',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
};
