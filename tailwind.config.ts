import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0b', panel: '#141417', line: '#26262b',
        muted: '#8b8b96', bright: '#f4f4f5',
        steel: '#d64000', steelDim: '#a83300',
      },
      fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] },
    },
  },
  plugins: [],
};
export default config;
