/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#374151",
        secondary: "#2563EB",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#F59E0B",
        surface: "#0F192C",
        surfaceAlt: "#121721",
        background: "#1F2937",
        card: "#0F1A2F",
        glass: "rgba(12,22,42,0.9)",
        glassSoft: "rgba(12,22,42,0.72)",
        glassStrong: "rgba(0,10,28,0.92)",
        borderSubtle: "rgba(226,235,240,0.12)",
        textPrimary: "#E2EBF0",
        textSecondary: "#A0AECB",
        accent: "#00D1FF",
        info: "#00D1FF",
        amber: "#F59E0B",
        tird: "#E5E5E5",
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /bg-\[#.*\]/,
    },
  ],
};
