/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette is fixed by docs/UI-UX-SPEC.md. Semantic names keep the
        // exact hex values out of components.
        base: '#080D16',
        rail: '#0A111D',
        sunken: '#0D1522',
        panel: '#111C2B',
        raised: '#162337',
        line: '#243247',
        accent: '#22D3EE',
        analysis: '#6366F1',
        ok: '#22C55E',
        warn: '#F59E0B',
        danger: '#EF4444',
        ink: '#F1F5F9',
        muted: '#94A3B8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2.25rem, 5vw, 3.5rem)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        lede: ['clamp(1rem, 1.5vw, 1.15rem)', { lineHeight: '1.6' }],
        metric: ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      gridTemplateColumns: {
        split: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
      },
      boxShadow: {
        panel: 'inset 0 1px 0 0 rgba(241, 245, 249, 0.03), 0 24px 48px -36px rgba(0, 0, 0, 0.9)',
        pop: '0 24px 64px -24px rgba(2, 6, 16, 0.9)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        scan: 'scan 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
