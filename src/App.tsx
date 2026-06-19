import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropzone from "./components/Dropzone";
import FileItem from "./components/FileItem";
import ProgressBar from "./components/ProgressBar";
import { LanguageToggle, ThemeToggle } from "./components/Toggles";
import { AlertIcon, DownloadIcon, ShieldIcon } from "./components/icons";
import type { Item, ItemStatus } from "./appTypes";
import { kindOf } from "./core/types";
import {
  clean,
  detectMetadata,
  onEngineState,
  preloadVideoEngine,
  type EngineState,
} from "./core";
import { saveAll } from "./platform/save";

let idCounter = 0;
const newId = () => `f${Date.now()}_${idCounter++}`;

function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("limpador-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("limpador-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

export default function App() {
  const { t } = useTranslation();
  const [dark, toggleTheme] = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [engine, setEngine] = useState<EngineState>("idle");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => onEngineState(setEngine), []);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const fresh: Item[] = [];
      for (const file of files) {
        const kind = kindOf(file.name);
        if (kind === "unsupported") continue;
        const previewUrl =
          kind === "image" && file.size < 25 * 1024 * 1024
            ? URL.createObjectURL(file)
            : undefined;
        fresh.push({
          id: newId(),
          file,
          kind,
          status: "analyzing" as ItemStatus,
          previewUrl,
        });
      }

      if (!fresh.length) return;
      setItems((prev) => [...prev, ...fresh]);

      // Pré-carrega o motor de vídeo assim que entra o 1º vídeo.
      if (fresh.some((f) => f.kind === "video")) preloadVideoEngine();

      // Detecção de metadados em background.
      for (const it of fresh) {
        detectMetadata(it.file)
          .then((meta) => patch(it.id, { meta, status: "pending" }))
          .catch(() => patch(it.id, { status: "pending" }));
      }
    },
    [patch],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  const cleanAll = useCallback(async () => {
    setRunning(true);
    const targets = itemsRef.current.filter(
      (i) => i.status === "pending" || i.status === "error",
    );
    for (const target of targets) {
      patch(target.id, { status: "cleaning", progress: 0 });
      const result = await clean(target.file, {
        onProgress: ({ ratio }) => patch(target.id, { progress: ratio }),
      });
      patch(target.id, {
        status: result.outcome as ItemStatus,
        result,
        progress: 1,
      });
    }
    setRunning(false);
  }, [patch]);

  const hasFiles = items.length > 0;
  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "error",
  ).length;
  const cleanedResults = items
    .map((i) => i.result)
    .filter((r): r is NonNullable<typeof r> => !!r?.data);
  const hasVideo = items.some((i) => i.kind === "video");

  // Progresso geral (0..1) durante a execução.
  const overall = useMemo(() => {
    if (!running) return 0;
    const weight = (i: Item) => {
      if (i.status === "ok" || i.status === "cleaned" || i.status === "error") return 1;
      if (i.status === "cleaning") return i.kind === "video" ? (i.progress ?? 0) : 0.5;
      return 0;
    };
    const considered = items.filter(
      (i) => i.status !== "analyzing" && i.status !== "pending",
    );
    const total = items.filter((i) => i.status !== "analyzing").length || 1;
    const done = considered.reduce((s, i) => s + weight(i), 0);
    return Math.min(1, done / total);
  }, [items, running]);

  const counts = useMemo(() => {
    const cleaned = items.filter((i) => i.status === "cleaned").length;
    const ok = items.filter((i) => i.status === "ok").length;
    const error = items.filter((i) => i.status === "error").length;
    return { cleaned, ok, error };
  }, [items]);
  const allDone =
    hasFiles &&
    !running &&
    items.every(
      (i) => i.status === "cleaned" || i.status === "ok" || i.status === "error",
    );

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 pb-28 pt-4">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-brand-500 p-2 text-white shadow-lg shadow-brand-500/30">
            <ShieldIcon width={24} height={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-none">{t("app.title")}</h1>
            <p className="text-xs text-brand-600 dark:text-brand-300">
              {t("app.tagline")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Selo de confiança */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-100/70 px-4 py-2.5 text-sm font-medium text-brand-700 dark:bg-brand-800/40 dark:text-brand-200">
        <ShieldIcon width={18} height={18} className="shrink-0" />
        {t("trust.badge")}
      </div>

      {/* Dropzone */}
      <div className="mt-4">
        <Dropzone onFiles={addFiles} />
      </div>

      {/* Aviso de vídeo + carregamento do motor */}
      {hasVideo && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40">
          <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{t("video.warning")}</p>
            {engine === "loading" && (
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar className="max-w-[160px]" />
                <span>{t("video.loadingEngine")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <section className="mt-4 flex flex-col gap-3">
        {!hasFiles && (
          <p className="py-8 text-center text-sm text-brand-500">{t("list.empty")}</p>
        )}
        {items.map((it) => (
          <FileItem key={it.id} item={it} onRemove={removeItem} />
        ))}
        {hasFiles && !running && (
          <button
            onClick={clearAll}
            className="self-center text-xs text-brand-500 underline-offset-2 hover:underline"
          >
            {t("list.clearAll")}
          </button>
        )}
      </section>

      {/* Resumo final */}
      {allDone && (
        <div className="mt-4 card animate-fade-in p-4 text-center">
          <p className="text-lg font-bold">{t("result.doneTitle")}</p>
          <p className="text-sm text-brand-600 dark:text-brand-300">
            {t("result.doneSubtitle")}
          </p>
          <p className="mt-1 text-xs text-brand-500">
            {t("result.summary", {
              cleaned: counts.cleaned,
              ok: counts.ok,
              error: counts.error,
            })}
          </p>
        </div>
      )}

      {/* Barra de ação fixa */}
      {hasFiles && (
        <div className="fixed inset-x-0 bottom-0 border-t border-brand-900/5 bg-brand-50/90 backdrop-blur dark:border-white/5 dark:bg-brand-900/90">
          <div className="mx-auto max-w-2xl px-4 py-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
            {running && (
              <div className="mb-2 flex items-center gap-2">
                <ProgressBar value={overall} className="flex-1" />
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-300">
                  {Math.round(overall * 100)}%
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={cleanAll}
                disabled={running || pendingCount === 0}
                className="btn-primary flex-1"
              >
                <ShieldIcon width={20} height={20} />
                {running ? t("actions.cleaning") : t("actions.cleanAll")}
              </button>
              {cleanedResults.length > 0 && !running && (
                <button
                  onClick={() => saveAll(cleanedResults)}
                  className="btn-ghost"
                >
                  <DownloadIcon width={20} height={20} />
                  {t("actions.downloadAll")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-brand-400">
        {t("footer.local")} · {t("footer.openSource")}
      </footer>
    </div>
  );
}
