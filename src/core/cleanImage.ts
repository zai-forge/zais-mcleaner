// Limpeza de imagens: strip SEM PERDA + verificação pós-limpeza.
// Espelha a lógica do script: [OK] (já limpo) / [LIMPO] / [ERRO].

import type { CleanResult } from "./types";
import { extOf } from "./types";
import { scanJpeg, stripJpeg } from "./jpeg";
import { scanPng, stripPng } from "./png";
import { scanWebp, stripWebp } from "./webp";
import { scanGif, stripGif } from "./gif";

interface FormatOps {
  mime: string;
  scan: (b: Uint8Array) => { hasMetadata: boolean; metaBytes: number };
  strip: (b: Uint8Array) => Uint8Array;
}

const OPS: Record<string, FormatOps> = {
  jpg: { mime: "image/jpeg", scan: scanJpeg, strip: stripJpeg },
  jpeg: { mime: "image/jpeg", scan: scanJpeg, strip: stripJpeg },
  png: { mime: "image/png", scan: scanPng, strip: stripPng },
  webp: { mime: "image/webp", scan: scanWebp, strip: stripWebp },
  gif: { mime: "image/gif", scan: scanGif, strip: stripGif },
};

export async function cleanImage(file: File): Promise<CleanResult> {
  const ext = extOf(file.name);
  const buf = new Uint8Array(await file.arrayBuffer());

  // BMP não possui metadados padronizados (sem EXIF) — já está limpo.
  if (ext === "bmp") {
    return {
      outcome: "ok",
      data: buf,
      filename: file.name,
      mime: "image/bmp",
      verified: true,
    };
  }

  const ops = OPS[ext];
  if (!ops) {
    // TIFF e outros: strip lossless confiável não é viável no navegador.
    // Mantém o original intacto (a versão desktop trata via exiftool).
    return {
      outcome: "error",
      filename: file.name,
      mime: file.type || "application/octet-stream",
      verified: false,
      error: "errors.unsupported",
    };
  }

  try {
    if (!ops.scan(buf).hasMetadata) {
      return { outcome: "ok", data: buf, filename: file.name, mime: ops.mime, verified: true };
    }
    const cleaned = ops.strip(buf);
    // Verificação: reanalisa o resultado e confirma ausência de metadados.
    const verified = !ops.scan(cleaned).hasMetadata;
    return {
      outcome: "cleaned",
      data: cleaned,
      filename: file.name,
      mime: ops.mime,
      verified,
    };
  } catch {
    return {
      outcome: "error",
      filename: file.name,
      mime: ops.mime,
      verified: false,
      error: "errors.failed",
    };
  }
}
