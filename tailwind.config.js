/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: "#334155",
        mist: "#e2e8f0",
        paper: "#f8fafc",
        sun: "#f59e0b",
        pine: "#166534",
        coral: "#dc2626",
        sky: "#0ea5e9"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.14)"
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
