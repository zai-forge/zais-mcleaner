// Remoção SEM PERDA de metadados de PNG.
//
// Um PNG é uma assinatura de 8 bytes seguida de chunks:
//   length(4) | type(4) | data(length) | crc(4)
// Mantemos apenas os chunks necessários para renderizar corretamente e
// descartamos os chunks de metadados textuais/EXIF/tempo.

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Chunks mantidos: críticos + os que afetam a renderização/cor.
const KEEP = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "iCCP", // perfil de cor — preservado para fidelidade visual
  "bKGD",
  "pHYs",
  "sBIT",
  "hIST",
  "sPLT",
]);

// Chunks de metadados explicitamente removidos (texto, EXIF, data/hora).
const META = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function isPng(buf: Uint8Array): boolean {
  if (buf.length < 8) return false;
  return PNG_SIG.every((b, i) => buf[i] === b);
}

interface Walk {
  hasMetadata: boolean;
  metaBytes: number;
  /** offsets dos chunks a manter (início do length) e seus tamanhos totais */
  keepRanges: Array<[number, number]>;
}

function walk(buf: Uint8Array): Walk {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 8;
  let hasMetadata = false;
  let metaBytes = 0;
  const keepRanges: Array<[number, number]> = [];
  while (p + 8 <= buf.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
    const total = 12 + len; // length + type + data + crc
    if (p + total > buf.length) break;
    const isAncillary = type[0] >= "a" && type[0] <= "z"; // 1ª letra minúscula
    if (META.has(type) || (isAncillary && !KEEP.has(type))) {
      hasMetadata = true;
      metaBytes += total;
    } else {
      keepRanges.push([p, total]);
    }
    p += total;
    if (type === "IEND") break;
  }
  return { hasMetadata, metaBytes, keepRanges };
}

export function scanPng(buf: Uint8Array): { hasMetadata: boolean; metaBytes: number } {
  if (!isPng(buf)) throw new Error("not a png");
  const w = walk(buf);
  return { hasMetadata: w.hasMetadata, metaBytes: w.metaBytes };
}

export function stripPng(buf: Uint8Array): Uint8Array {
  if (!isPng(buf)) throw new Error("not a png");
  const { keepRanges } = walk(buf);
  let size = 8;
  for (const [, total] of keepRanges) size += total;
  const out = new Uint8Array(size);
  out.set(PNG_SIG, 0);
  let o = 8;
  for (const [start, total] of keepRanges) {
    out.set(buf.subarray(start, start + total), o);
    o += total;
  }
  return out;
}
