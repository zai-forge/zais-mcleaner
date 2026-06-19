// Ponto de entrada do núcleo de limpeza.
//
// Interface única `clean(file)` que despacha para o motor adequado. Hoje todos
// os motores rodam no navegador (WASM/JS). A abstração já está pronta para, no
// desktop, trocar por sidecars nativos (exiftool/ffmpeg) sem mexer na UI.

import type { CleanResult, MediaKind } from "./types";
import { kindOf } from "./types";
import { cleanImage } from "./cleanImage";
import { cleanVideo, type VideoProgress } from "./cleanVideo";

export * from "./types";
export { detectMetadata } from "./detect";
export {
  preloadVideoEngine,
  onEngineState,
  type EngineState,
} from "./cleanVideo";

export interface CleanOptions {
  onProgress?: (p: VideoProgress) => void;
}

export async function clean(
  file: File,
  opts: CleanOptions = {},
): Promise<CleanResult> {
  const kind: MediaKind = kindOf(file.name);
  switch (kind) {
    case "image":
      return cleanImage(file);
    case "video":
      return cleanVideo(file, opts.onProgress);
    default:
      return {
        outcome: "error",
        filename: file.name,
        mime: file.type || "application/octet-stream",
        verified: false,
        error: "errors.unsupported",
      };
  }
}
