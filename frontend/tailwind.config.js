/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0B0F19",      // Deep workspace black-blue
          card: "#151F32",    // Slick card gray-blue
          border: "#22344F",  // Premium metallic border
          accent: "#2D3E56",  // Muted gray-blue accent
          hover: "#1D2D44"    // Hover background
        },
        brand: {
          primary: "#3B82F6",   // Smart electric blue
          secondary: "#8B5CF6", // High-tech purple
          success: "#10B981",   // Deep emerald for audits
          warning: "#F59E0B",   // Warm amber for manual review
          danger: "#EF4444"     // Crimson for low confidence
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'laser-scanner': 'laser 3s infinite linear',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        laser: {
          '0%': { transform: 'translateY(0)', opacity: 0.8 },
          '50%': { transform: 'translateY(28rem)', opacity: 0.8 },
          '100%': { transform: 'translateY(0)', opacity: 0.8 },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
