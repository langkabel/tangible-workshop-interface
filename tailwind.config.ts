import type { Config } from 'tailwindcss';

export default {
  content: ['./*.html', './components/**/*.html', './src/**/*.ts'],
  theme: {
    extend: {
      keyframes: {
        'float-up': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-100vh) scale(1.5)' },
        },
      },
      animation: {
        'float-up': 'float-up 3s ease-out forwards',
      },
    },
  },
} satisfies Config;
