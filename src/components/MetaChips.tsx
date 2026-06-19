// Chips coloridos mostrando as categorias de metadados detectadas.
import { useTranslation } from "react-i18next";
import type { MetaCategory } from "../core/types";

const STYLE: Record<MetaCategory, string> = {
  gps: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  camera: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  date: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  software: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  other: "bg-brand-100 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100",
};

export default function MetaChips({ categories }: { categories: MetaCategory[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <span
          key={c}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[c]}`}
        >
          {t(`meta.${c}`)}
        </span>
      ))}
    </div>
  );
}
