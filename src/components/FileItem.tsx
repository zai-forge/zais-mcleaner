// Linha de um arquivo: prévia, nome, metadados detectados, status,
// barra de progresso por arquivo e ações (baixar/compartilhar).
import { useTranslation } from "react-i18next";
import type { Item } from "../appTypes";
import { formatBytes } from "../appTypes";
import { canShare, saveResult, shareResult } from "../platform/save";
import MetaChips from "./MetaChips";
import ProgressBar from "./ProgressBar";
import {
  AlertIcon,
  CheckIcon,
  DownloadIcon,
  ImageIcon,
  ShareIcon,
  TrashIcon,
  VideoIcon,
} from "./icons";

interface Props {
  item: Item;
  onRemove: (id: string) => void;
}

function StatusBadge({ item }: { item: Item }) {
  const { t } = useTranslation();
  const map = {
    ok: "bg-brand-100 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100",
    cleaned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    error: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  } as const;
  if (item.status === "cleaned" || item.status === "ok") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${map[item.status]}`}>
        <CheckIcon width={14} height={14} />
        {t(`status.${item.status}`)}
      </span>
    );
  }
  if (item.status === "error") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${map.error}`}>
        <AlertIcon width={14} height={14} />
        {t("status.error")}
      </span>
    );
  }
  return null;
}

export default function FileItem({ item, onRemove }: Props) {
  const { t } = useTranslation();
  const busy = item.status === "cleaning" || item.status === "analyzing";
  const done = item.status === "cleaned" || item.status === "ok";

  return (
    <div className="card animate-fade-in flex gap-3 p-3">
      {/* Prévia */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-brand-500 dark:bg-brand-900/50">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : item.kind === "video" ? (
          <VideoIcon width={26} height={26} />
        ) : (
          <ImageIcon width={26} height={26} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.file.name}</p>
            <p className="text-xs text-brand-500 dark:text-brand-400">
              {formatBytes(item.file.size)}
            </p>
          </div>
          {!busy && (
            <button
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded-lg p-1 text-brand-400 hover:bg-brand-100 hover:text-rose-500 dark:hover:bg-brand-700/50"
              aria-label={t("list.remove")}
            >
              <TrashIcon width={18} height={18} />
            </button>
          )}
        </div>

        {/* Metadados detectados (antes de limpar) */}
        {item.status === "analyzing" && (
          <p className="text-xs text-brand-500">{t("list.checking")}</p>
        )}
        {item.status === "pending" && item.meta && (
          item.meta.hasMetadata ? (
            <MetaChips categories={item.meta.categories} />
          ) : (
            <p className="text-xs text-brand-500">{t("list.none")}</p>
          )
        )}

        {/* Progresso */}
        {item.status === "cleaning" && (
          <div className="flex flex-col gap-1">
            <ProgressBar
              value={item.kind === "video" ? item.progress : undefined}
            />
            <p className="text-xs text-brand-500">
              {t("status.cleaning")}
              {item.kind === "video" && item.progress !== undefined
                ? ` · ${Math.round(item.progress * 100)}%`
                : "…"}
            </p>
          </div>
        )}

        {/* Resultado */}
        {(done || item.status === "error") && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge item={item} />
            {done && item.result?.verified && (
              <span className="text-xs text-emerald-600 dark:text-emerald-300">
                {t("status.verified")}
              </span>
            )}
            {item.status === "error" && item.result?.error && (
              <span className="text-xs text-rose-600 dark:text-rose-300">
                {t(item.result.error)}
              </span>
            )}
          </div>
        )}

        {/* Ações por arquivo */}
        {done && item.result?.data && (
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => saveResult(item.result!)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              <DownloadIcon width={16} height={16} />
              {t("actions.download")}
            </button>
            {canShare(item.result) && (
              <button
                onClick={() => shareResult(item.result!)}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                <ShareIcon width={16} height={16} />
                {t("actions.share")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
