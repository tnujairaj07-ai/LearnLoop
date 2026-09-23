/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2430',
          light: '#3A4453',
          faint: '#6B7686',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          sunken: '#F3F5F4',
          raised: '#FFFFFF',
        },
        border: {
          DEFAULT: '#DCE2DF',
          strong: '#B9C2BE',
        },
        teal: {
          DEFAULT: '#2F6F62',
          50: '#EAF3F1',
          100: '#CFE6E0',
          600: '#2F6F62',
          700: '#255A50',
        },
        amber: {
          DEFAULT: '#C97A2B',
          50: '#FBF1E6',
          100: '#F3DCBB',
          600: '#C97A2B',
          700: '#A6621F',
        },
        clay: {
          DEFAULT: '#B3453B',
          50: '#FBEBE9',
          100: '#F2C9C4',
          600: '#B3453B',
          700: '#8F3630',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(27, 36, 48, 0.06)',
      },
    },
  },
  plugins: [],
}
