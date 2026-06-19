// Toggles de idioma (PT/EN) e tema (claro/escuro).
import { useTranslation } from "react-i18next";
import { MoonIcon, SunIcon } from "./icons";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage?.startsWith("en") ? "en" : "pt";
  const next = current === "pt" ? "en" : "pt";
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="btn-ghost px-3 py-2 text-sm font-bold uppercase tracking-wide"
      aria-label="Idioma / Language"
    >
      {current === "pt" ? "PT" : "EN"}
    </button>
  );
}

interface ThemeProps {
  dark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ dark, onToggle }: ThemeProps) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onToggle}
      className="btn-ghost px-3 py-2"
      aria-label={t("theme.toggle")}
    >
      {dark ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
    </button>
  );
}
