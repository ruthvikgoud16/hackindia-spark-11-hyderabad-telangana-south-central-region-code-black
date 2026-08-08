import { useTheme } from "../theme/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-[rgba(45,82,73,0.14)] bg-white/80 text-[10px] font-bold uppercase tracking-wider text-[#5c6b66] hover:border-[#3f6b5f] hover:text-[#2d5249] transition-colors ${className}`}
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? (
        <Sun className="w-3.5 h-3.5 text-[#8a6a2f]" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-[#3f6b5f]" />
      )}
      {theme === "light" ? "Light" : "Dark"}
    </button>
  );
}
