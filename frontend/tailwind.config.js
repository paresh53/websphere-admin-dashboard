/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#0f62fe',
          'blue-dark': '#0043ce',
          gray: '#f4f4f4',
          'gray-dark': '#262626',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
