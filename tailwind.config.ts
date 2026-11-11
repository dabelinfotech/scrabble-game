import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'board-bg': '#1a6b3c',
        'board-border': '#0d4a26',
        'tile-bg': '#f5deb3',
        'tile-border': '#c4a46c',
        'tile-text': '#2c1810',
        'tw-square': '#e63946',
        'dw-square': '#f4a261',
        'tl-square': '#457b9d',
        'dl-square': '#a8dadc',
        'center-star': '#f4a261',
        'rack-bg': '#8b6914',
        'timer-danger': '#dc2626',
        'timer-warning': '#f59e0b',
        'timer-safe': '#10b981',
      },
      fontFamily: {
        'game': ['Georgia', 'serif'],
        'score': ['"Courier New"', 'monospace'],
      },
      animation: {
        'tile-place': 'tileDrop 0.3s ease-out',
        'tile-shake': 'shake 0.5s ease-in-out',
        'pulse-danger': 'pulseDanger 1s ease-in-out infinite',
        'score-pop': 'scorePop 0.6s ease-out',
        'timer-tick': 'timerTick 1s ease-in-out infinite',
      },
      keyframes: {
        tileDrop: {
          '0%': { transform: 'scale(1.2) translateY(-10px)', opacity: '0.6' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        pulseDanger: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(220, 38, 38, 0)' },
        },
        scorePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        timerTick: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

