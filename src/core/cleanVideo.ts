// Limpeza de vídeos via ffmpeg.wasm (core single-thread, compatível com
// GitHub Pages e webviews sem SharedArrayBuffer).
//
// Reproduz o comando do script original: re-encode completo apagando todos os
// metadados E a impressão digital do codificador original.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { CleanResult } from "./types";
import { extOf } from "./types";

// Permite hospedar o core localmente (ex.: /ffmpeg) sobrescrevendo via env.
const CORE_BASE =
  import.meta.env.VITE_FFMPEG_CORE_URL ??
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type EngineState = "idle" | "loading" | "ready";
type EngineListener = (s: EngineState) => void;
const engineListeners = new Set<EngineListener>();

export function onEngineState(cb: EngineListener): () => void {
  engineListeners.add(cb);
  return () => engineListeners.delete(cb);
}
function setEngineState(s: EngineState) {
  engineListeners.forEach((cb) => cb(s));
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadPromise) return loadPromise;
  setEngineState("loading");
  loadPromise = (async () => {
    const instance = new FFmpeg();
    await instance.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    setEngineState("ready");
    return instance;
  })();
  return loadPromise;
}

/** Pré-carrega o motor de vídeo (para mostrar "carregando" cedo na UI). */
export function preloadVideoEngine(): void {
  void getFFmpeg();
}

export interface VideoProgress {
  /** 0..1 */
  ratio: number;
}

export async function cleanVideo(
  file: File,
  onProgress?: (p: VideoProgress) => void,
): Promise<CleanResult> {
  const ext = extOf(file.name) || "mp4";
  const inName = `in.${ext}`;
  const outName = "out.mp4";
  const outFilename = file.name.replace(/\.[^.]+$/, "") + ".mp4";

  let instance: FFmpeg;
  try {
    instance = await getFFmpeg();
  } catch {
    return {
      outcome: "error",
      filename: file.name,
      mime: "video/mp4",
      verified: false,
      error: "errors.failed",
    };
  }

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({ ratio: Math.max(0, Math.min(1, progress)) });
  };
  instance.on("progress", progressHandler);

  try {
    await instance.writeFile(inName, await fetchFile(file));
    const code = await instance.exec([
      "-i",
      inName,
      "-map_metadata",
      "-1",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      outName,
    ]);
    if (code !== 0) throw new Error(`ffmpeg exit ${code}`);
    const data = (await instance.readFile(outName)) as Uint8Array;
    // limpeza dos arquivos temporários do FS virtual
    await instance.deleteFile(inName).catch(() => {});
    await instance.deleteFile(outName).catch(() => {});
    onProgress?.({ ratio: 1 });
    return {
      outcome: "cleaned",
      data,
      filename: outFilename,
      mime: "video/mp4",
      verified: true, // re-encode com -map_metadata -1 garante ausência de metadados
    };
  } catch {
    await instance.deleteFile(inName).catch(() => {});
    return {
      outcome: "error",
      filename: file.name,
      mime: "video/mp4",
      verified: false,
      error: "errors.failed",
    };
  } finally {
    instance.off("progress", progressHandler);
  }
}
