import type { Config } from 'tailwindcss';

/* Palette lifted from the Bells of Steel training hub stylesheet, so the
   portfolio reads in their design language rather than a generic one.
   Token names are kept from the previous dark theme to keep diffs small. */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#ffffff',          // --bg
        panel: '#f6f7f8',        // --surface
        panel2: '#e9ecee',       // --surface-2
        line: '#d8dde0',         // --border
        lineStrong: '#b8bfc4',   // --border-strong
        bright: '#000000',       // --text
        dim: '#4a4a4a',          // --text-dim
        muted: '#555555',        // --text-muted
        steel: '#ff4b29',        // --accent
        steelDim: '#d63a1f',     // --accent-dark
        steelSoft: '#fff1ee',    // --accent-soft
      },
      borderRadius: { DEFAULT: '8px', lg: '14px' },
      boxShadow: {
        soft: '0 6px 24px rgba(0, 0, 0, 0.06)',
        strong: '0 12px 40px rgba(0, 0, 0, 0.10)',
        glow: '0 6px 20px rgba(255, 75, 41, 0.20)',
        glowLg: '0 10px 28px rgba(255, 75, 41, 0.20)',
      },
      fontFamily: {
        sans: ['var(--font-rubik)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: { label: '0.14em', wide2: '0.18em' },
    },
  },
  plugins: [],
};
export default config;
