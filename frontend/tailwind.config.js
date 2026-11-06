/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base surfaces (student's "paper" + teacher's "surface" unified)
        paper: "#F7F8FA",
        ink: {
          DEFAULT: "#1E2A3A",
          light: "#3A4453",
          faint: "#6B7686",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          sunken: "#F7F8FA",
          raised: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E1E5EA",
          strong: "#B9C2BE",
        },

        // Brand accent — the student frontend's blue is the single source
        // of truth. "teal" is kept as an alias so every existing
        // teacher/admin class (btn-primary, bg-teal-50, text-teal-700,
        // panel-accent-teal, active nav states, …) picks it up automatically.
        primary: {
          DEFAULT: "#2F5D8A",
          dark: "#244A6E",
          light: "#E8F0F8",
        },
        teal: {
          DEFAULT: "#2F5D8A",
          50: "#E8F0F8",
          100: "#D2E1F1",
          600: "#2F5D8A",
          700: "#244A6E",
        },

        // Positive / growth feedback (student "growth" + teacher's success shade)
        growth: {
          DEFAULT: "#3E8E6D",
          light: "#E7F3EE",
        },

        // Warning / needs-attention accent — student's "attention" is the
        // reference; teacher's "amber" is aliased onto it.
        attention: {
          DEFAULT: "#C77B3B",
          light: "#FBEEE2",
        },
        amber: {
          DEFAULT: "#C77B3B",
          50: "#FBEEE2",
          100: "#F5DDC4",
          600: "#C77B3B",
          700: "#A6621F",
        },

        // Danger / destructive actions (teacher's "clay", kept distinct from
        // the warning color on purpose so delete/error states stay legible).
        clay: {
          DEFAULT: "#B3453B",
          50: "#FBEBE9",
          100: "#F2C9C4",
          600: "#B3453B",
          700: "#8F3630",
        },
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
        body: ["Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        md: "10px",
        card: "10px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(30, 42, 58, 0.06)",
      },
      maxWidth: {
        content: "72ch",
      },
    },
  },
  plugins: [],
};
