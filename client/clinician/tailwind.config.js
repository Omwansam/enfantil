/**
 * Enfantil clinician portal design tokens (from the "Enfantil — UI/UX Design"
 * design-system page). Loaded by Tailwind v4 through `@config` in src/index.css.
 *
 * The portal shares the family app's palette but frames it in deep teal
 * (`portal`) so staff screens are clearly different from the caregiver app.
 * Status colours are named after their badge, e.g. `bg-upcoming-bg text-upcoming`.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        portal: {
          DEFAULT: '#0B3B37',
          text: '#B7D3CF',
          700: '#13504A',
          900: '#072A27',
        },
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        coral: {
          50: '#FFF1EE',
          100: '#FFE4DE',
          200: '#F9C8BD',
          500: '#E8553F',
          700: '#B4432F',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          700: '#B45309',
          800: '#92400E',
        },
        ink: '#0F172A',
        slate: { 600: '#475569' },
        muted: '#556070',
        line: '#E7E5E0',
        page: '#F8F7F4',
        sand: '#EFEDE8',
        info: { DEFAULT: '#1D4ED8', bg: '#EFF6FF', line: '#BFDBFE' },
        upcoming: { DEFAULT: '#1D4ED8', bg: '#EFF6FF' },
        due: { DEFAULT: '#1D4ED8', bg: '#EFF6FF' },
        completed: { DEFAULT: '#047857', bg: '#ECFDF5' },
        uptodate: { DEFAULT: '#047857', bg: '#ECFDF5' },
        cancelled: { DEFAULT: '#475569', bg: '#F1F5F9' },
        overdue: { DEFAULT: '#B4432F', bg: '#FFF1EE' },
        given: { DEFAULT: '#0F766E', bg: '#F0FDFA' },
        planned: { DEFAULT: '#B45309', bg: '#FFFBEB' },
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.01em' }],
        h1: ['28px', { lineHeight: '36px', fontWeight: '700', letterSpacing: '-0.01em' }],
        h2: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px' }],
        small: ['13px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        input: '12px',
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)',
        pop: '0 4px 12px rgba(15,23,42,.08), 0 16px 40px rgba(15,23,42,.12)',
      },
      width: {
        sidebar: '248px',
      },
    },
  },
}
