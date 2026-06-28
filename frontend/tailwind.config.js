/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#0a1510',
          900: '#0f1f18',
          800: '#1a3c2e',
          700: '#245040',
          600: '#2d6a4f',
          500: '#3a8a67',
          400: '#52b788',
          300: '#74c69d',
          200: '#95d5b2',
          100: '#d8f3dc',
          50:  '#f0fdf4',
        },
        gold: {
          600: '#c47d00',
          500: '#f0a500',
          400: '#f5bc3a',
          300: '#fad06f',
          200: '#fde3a0',
          100: '#fff3cd',
        },
        soil: {
          800: '#3d1c02',
          600: '#7d4e1a',
          400: '#c4843a',
          200: '#f0c895',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scan': 'scan 2s ease-in-out infinite',
        'pulse-mic': 'pulse-mic 1.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.35s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-dot': 'bounce-dot 1.2s ease-in-out infinite',
        'number-tick': 'number-tick 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { top: '0%', opacity: '1' },
          '50%': { opacity: '0.6' },
          '100%': { top: '100%', opacity: '1' },
        },
        'pulse-mic': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(240,165,0,0.4)' },
          '50%': { boxShadow: '0 0 0 16px rgba(240,165,0,0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(82,183,136,0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(82,183,136,0.8)' },
        }
      }
    },
  },
  plugins: [],
}
