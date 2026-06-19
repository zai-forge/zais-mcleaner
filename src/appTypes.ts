// Tipos da camada de UI.
import type { CleanResult, MediaKind, MetaSummary } from "./core/types";

export type ItemStatus =
  | "pending"
  | "analyzing"
  | "cleaning"
  | "ok"
  | "cleaned"
  | "error";

export interface Item {
  id: string;
  file: File;
  kind: MediaKind;
  status: ItemStatus;
  meta?: MetaSummary;
  /** progresso 0..1 durante a limpeza (usado em vídeos) */
  progress?: number;
  result?: CleanResult;
  previewUrl?: string;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}
