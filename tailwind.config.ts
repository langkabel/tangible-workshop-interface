import type { Config } from 'tailwindcss';

export default {
  content: ['./*.html', './components/**/*.html', './src/**/*.ts'],
  theme: {
    extend: {
      keyframes: {
        'float-up': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-50vh)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'float-up': 'float-up 3s ease-out forwards',
        'spin-slow': 'spin-slow 4s linear infinite',
      },
    },
  },
} satisfies Config;
