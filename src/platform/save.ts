// Camada de plataforma: roteia a saída do arquivo limpo conforme o ambiente.
//   - Navegador / PWA: download direto ou Web Share API (compartilhar em apps).
//   - Tauri (Android/Windows): diálogo nativo "salvar" + escrita no sistema.

import type { CleanResult } from "../core/types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toBlob(result: CleanResult): Blob {
  // cópia para um ArrayBuffer "puro" (evita o tipo SharedArrayBuffer em alguns TS)
  const bytes = result.data!;
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: result.mime });
}

function browserDownload(result: CleanResult): void {
  const url = URL.createObjectURL(toBlob(result));
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function tauriSave(result: CleanResult): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({ defaultPath: result.filename });
  if (!path) return; // usuário cancelou
  await writeFile(path, result.data!);
}

/** Salva um arquivo limpo (download no web, diálogo nativo no Tauri). */
export async function saveResult(result: CleanResult): Promise<void> {
  if (!result.data) return;
  if (isTauri()) {
    await tauriSave(result);
  } else {
    browserDownload(result);
  }
}

/** Compartilha via Web Share API quando disponível (ideal no celular). */
export function canShare(result: CleanResult): boolean {
  if (isTauri() || !result.data) return false;
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  const file = new File([toBlob(result)], result.filename, { type: result.mime });
  return navigator.canShare({ files: [file] });
}

export async function shareResult(result: CleanResult): Promise<void> {
  if (!result.data) return;
  const file = new File([toBlob(result)], result.filename, { type: result.mime });
  await navigator.share({ files: [file], title: result.filename });
}

/** Salva todos os resultados limpos com sucesso. */
export async function saveAll(results: CleanResult[]): Promise<void> {
  for (const r of results) {
    if (r.data) await saveResult(r);
  }
}
