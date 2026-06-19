// Tipos compartilhados do núcleo de limpeza.

export type MediaKind = "image" | "video" | "unsupported";

export type MetaCategory = "gps" | "camera" | "date" | "software" | "other";

export interface MetaSummary {
  hasMetadata: boolean;
  categories: MetaCategory[];
  /** nº aproximado de campos/segmentos de metadados encontrados */
  fieldCount: number;
}

export type CleanOutcome = "ok" | "cleaned" | "error";

export interface CleanResult {
  outcome: CleanOutcome;
  /** bytes do arquivo limpo (ausente quando outcome === "error") */
  data?: Uint8Array;
  /** nome de saída sugerido (pode mudar a extensão, ex.: vídeo -> .mp4) */
  filename: string;
  /** tipo MIME de saída */
  mime: string;
  /** true se a verificação pós-limpeza confirmou ausência de metadados */
  verified: boolean;
  /** mensagem de erro (chave i18n ou texto) quando outcome === "error" */
  error?: string;
}

export const IMAGE_EXTS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "tiff",
  "tif",
  "bmp",
] as const;

export const VIDEO_EXTS = ["mp4", "webm", "mov"] as const;

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function kindOf(name: string): MediaKind {
  const ext = extOf(name);
  if ((IMAGE_EXTS as readonly string[]).includes(ext)) return "image";
  if ((VIDEO_EXTS as readonly string[]).includes(ext)) return "video";
  return "unsupported";
}
