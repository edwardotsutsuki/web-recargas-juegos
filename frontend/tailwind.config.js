/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gamer: {
          bg: "#080c14",
          card: "#0f172a",
          cardHover: "#172033",
          border: "#1e293b",
          primary: "#6366f1",
          primaryHover: "#4f46e5",
          accent: "#06b6d4",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        }
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(99, 102, 241, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(6, 182, 212, 0.5)',
        'glow-success': '0 0 20px -5px rgba(16, 185, 129, 0.5)',
        'glow-danger': '0 0 20px -5px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}

