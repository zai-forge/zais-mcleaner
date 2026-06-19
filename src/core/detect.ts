// Detecção de metadados para exibir ao usuário ANTES de limpar
// ("olha o que estava escondido aqui"). Não modifica o arquivo.

import piexif from "piexifjs";
import type { MetaCategory, MetaSummary } from "./types";
import { extOf } from "./types";
import { scanJpeg } from "./jpeg";
import { scanPng } from "./png";
import { scanWebp } from "./webp";
import { scanGif } from "./gif";

const EMPTY: MetaSummary = { hasMetadata: false, categories: [], fieldCount: 0 };

function bytesToBinaryString(buf: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    s += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return s;
}

// IDs de tags EXIF usados para categorizar.
const TAG = {
  Make: 271,
  Model: 272,
  Software: 305,
  DateTime: 306,
  DateTimeOriginal: 36867,
  DateTimeDigitized: 36868,
};

function categorizeJpeg(buf: Uint8Array): MetaSummary {
  const base = scanJpeg(buf);
  if (!base.hasMetadata) return EMPTY;
  const categories = new Set<MetaCategory>();
  let fieldCount = 0;
  try {
    const exif = piexif.load(bytesToBinaryString(buf));
    const zeroth = exif["0th"] ?? {};
    const exifIfd = exif["Exif"] ?? {};
    const gps = exif["GPS"] ?? {};
    fieldCount =
      Object.keys(zeroth).length +
      Object.keys(exifIfd).length +
      Object.keys(gps).length +
      Object.keys(exif["1st"] ?? {}).length;
    if (Object.keys(gps).length > 0) categories.add("gps");
    if (zeroth[TAG.Make] || zeroth[TAG.Model]) categories.add("camera");
    if (
      zeroth[TAG.DateTime] ||
      exifIfd[TAG.DateTimeOriginal] ||
      exifIfd[TAG.DateTimeDigitized]
    )
      categories.add("date");
    if (zeroth[TAG.Software]) categories.add("software");
  } catch {
    // EXIF ausente/ilegível, mas há outros segmentos (XMP/IPTC/COM/ICC...)
  }
  if (categories.size === 0) categories.add("other");
  return {
    hasMetadata: true,
    categories: [...categories],
    fieldCount: Math.max(fieldCount, 1),
  };
}

function fromScan(scan: { hasMetadata: boolean; metaBytes: number }): MetaSummary {
  if (!scan.hasMetadata) return EMPTY;
  return { hasMetadata: true, categories: ["other"], fieldCount: 1 };
}

export async function detectMetadata(file: File): Promise<MetaSummary> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const ext = extOf(file.name);
  try {
    switch (ext) {
      case "jpg":
      case "jpeg":
        return categorizeJpeg(buf);
      case "png":
        return fromScan(scanPng(buf));
      case "webp":
        return fromScan(scanWebp(buf));
      case "gif":
        return fromScan(scanGif(buf));
      default:
        // Vídeos e formatos sem scanner: assumimos que pode haver metadados.
        return { hasMetadata: true, categories: ["other"], fieldCount: 1 };
    }
  } catch {
    return { hasMetadata: true, categories: ["other"], fieldCount: 1 };
  }
}
