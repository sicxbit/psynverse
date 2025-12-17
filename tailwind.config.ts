import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        midnight: '#0f172a',
        blush: '#f9e5ec',
        sage: '#d8e2dc',
        mist: '#e9eef5',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(15, 23, 42, 0.2)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config