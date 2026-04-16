/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0F766E', 50: '#F0FDF9', 100: '#CCFBF1', 200: '#99F6E4',
          300: '#5EEAD4', 400: '#2DD4BF', 500: '#0D9488', 600: '#0F766E',
          700: '#0E6660', 800: '#085041', 900: '#064E3B',
        },
        slate: {
          DEFAULT: '#1E293B', 50: '#F4F6F8', 100: '#F1F5F9', 200: '#E2E8F0',
          300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569',
          700: '#334155', 800: '#1E293B', 900: '#0F172A',
        },
      },
      fontFamily: { sora: ['Sora', 'sans-serif'], dm: ['DM Sans', 'sans-serif'] },
    },
  },
  plugins: [],
};
