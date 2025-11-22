/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // New dark aesthetic colors
        'glass-dark': 'rgba(0, 0, 0, 0.4)',
        'glass-purple': 'rgba(28, 49, 135, 0.15)',
        'glass-light': 'rgba(36, 2, 117, 0.08)',
        'purple-deep': '#000000',
        'purple-dark': '#0a0a0f',
        'purple-mid': '#581c87',
        'purple-bright': '#8b5cf6',
        'purple-light': '#a78bfa',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 20px 60px 0 rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(88, 28, 135, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(88, 28, 135, 0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)' },
        },
      },
      fontWeight: {
        'extralight': 200,
        'light': 300,
      },
      letterSpacing: {
        'tighter': '-0.04em',
        'tight': '-0.02em',
      },
    },
  },
  plugins: [],
}
