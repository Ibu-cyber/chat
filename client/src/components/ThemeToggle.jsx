import { useTheme } from "../context/ThemeContext";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export default ThemeToggle;
