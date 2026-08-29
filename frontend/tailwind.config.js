/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1D26',        // near-black navy background
        panel: '#0F2733',      // panel surface
        panel2: '#132F3D',     // slightly lighter panel
        line: '#1E3F4E',       // hairline borders
        aqua: '#2FB8C6',       // primary signature accent (teal-cyan)
        aqua2: '#1A8A97',
        amber: '#E3A857',      // warning / medium risk
        coral: '#E4634F',      // high / critical risk
        mint: '#57C29A',       // low risk / positive
        mist: '#7FA8B3',       // muted secondary text
        fog: '#B8D2D9',        // body text on dark
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -14px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
