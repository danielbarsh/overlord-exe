/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05060f',
        panel: '#0b0e1c',
        ide: { bg: '#1e1e2a', side: '#181822', line: '#2a2a3a', tab: '#252535', status: '#6d28d9' },
        neon: { cyan: '#22e4ff', pink: '#ff2bd6', lime: '#a6ff3a', amber: '#ffb020', red: '#ff3b5c' },
      },
      fontFamily: {
        heb: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        orb: ['Orbitron', 'Rubik', 'sans-serif'],
      },
      keyframes: {
        flicker: { '0%,100%': { opacity: '1' }, '47%': { opacity: '1' }, '48%': { opacity: '.55' }, '50%': { opacity: '1' }, '78%': { opacity: '.85' } },
        glitch: {
          '0%,100%': { transform: 'translate(0,0) skewX(0)' },
          '20%': { transform: 'translate(-3px,1px) skewX(8deg)' },
          '40%': { transform: 'translate(3px,-2px) skewX(-6deg)' },
          '60%': { transform: 'translate(-2px,2px)' },
          '80%': { transform: 'translate(2px,-1px) skewX(4deg)' },
        },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        laugh: { '0%,100%': { transform: 'translateY(0) rotate(0)' }, '25%': { transform: 'translateY(-3px) rotate(-3deg)' }, '75%': { transform: 'translateY(-3px) rotate(3deg)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-3px)' }, '75%': { transform: 'translateX(3px)' } },
        glow: { '0%,100%': { boxShadow: '0 0 8px #22e4ff, 0 0 18px #22e4ff66' }, '50%': { boxShadow: '0 0 14px #22e4ff, 0 0 34px #22e4ffaa' } },
        scan: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 8px' } },
        pop: { '0%': { transform: 'scale(.85)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        flicker: 'flicker 3.2s infinite',
        glitch: 'glitch .25s infinite',
        bob: 'bob 3s ease-in-out infinite',
        laugh: 'laugh .35s ease-in-out infinite',
        shake: 'shake .12s linear infinite',
        glow: 'glow 1.8s ease-in-out infinite',
        scan: 'scan .6s linear infinite',
        pop: 'pop .22s ease-out both',
      },
    },
  },
  plugins: [],
};
