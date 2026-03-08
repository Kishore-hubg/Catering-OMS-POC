/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#F4A300',
          600: '#E68900',
          700: '#CC7700',
          800: '#B36600',
          900: '#8C5000',
        },
        navy: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          200: '#9FA8DA',
          300: '#7986CB',
          400: '#5C6BC0',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111B35',
          800: '#0D142B',
          900: '#080D1F',
        },
        cream: {
          50: '#FFFDF5',
          100: '#FFF9E8',
          200: '#FFF5D6',
          300: '#FFF0C4',
          400: '#FFEBB2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
