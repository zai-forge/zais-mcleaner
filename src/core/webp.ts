// Remoção SEM PERDA de metadados de WebP (container RIFF).
//
// Estrutura: "RIFF" | tamanho(4 LE) | "WEBP" | chunks
// Cada chunk: fourcc(4) | size(4 LE) | data(size) | pad(1 byte se size ímpar)
// Removemos os chunks "EXIF" e "XMP " (mantemos "ICCP" para fidelidade de cor)
// e, se houver VP8X, limpamos os bits de flag de EXIF/XMP.

const td = new TextDecoder("ascii");

function fourcc(buf: Uint8Array, p: number): string {
  return td.decode(buf.subarray(p, p + 4));
}

function isWebp(buf: Uint8Array): boolean {
  return (
    buf.length >= 12 && fourcc(buf, 0) === "RIFF" && fourcc(buf, 8) === "WEBP"
  );
}

const EXIF_FLAG = 0x08;
const XMP_FLAG = 0x04;

interface Chunk {
  fourcc: string;
  start: number; // início do header do chunk
  total: number; // header(8) + data + padding
  dataStart: number;
}

function chunks(buf: Uint8Array): Chunk[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const list: Chunk[] = [];
  let p = 12;
  while (p + 8 <= buf.length) {
    const cc = fourcc(buf, p);
    const size = dv.getUint32(p + 4, true);
    const padded = size + (size & 1);
    const total = 8 + padded;
    if (p + total > buf.length + 1) break;
    list.push({ fourcc: cc, start: p, total, dataStart: p + 8 });
    p += total;
  }
  return list;
}

const isMetaChunk = (cc: string) => cc === "EXIF" || cc === "XMP ";

export function scanWebp(buf: Uint8Array): { hasMetadata: boolean; metaBytes: number } {
  if (!isWebp(buf)) throw new Error("not a webp");
  let hasMetadata = false;
  let metaBytes = 0;
  for (const c of chunks(buf)) {
    if (isMetaChunk(c.fourcc)) {
      hasMetadata = true;
      metaBytes += c.total;
    }
  }
  return { hasMetadata, metaBytes };
}

export function stripWebp(buf: Uint8Array): Uint8Array {
  if (!isWebp(buf)) throw new Error("not a webp");
  const list = chunks(buf);
  const kept = list.filter((c) => !isMetaChunk(c.fourcc));

  let bodySize = 4; // "WEBP"
  for (const c of kept) bodySize += c.total;

  const out = new Uint8Array(8 + bodySize);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  new DataView(out.buffer).setUint32(4, bodySize, true);
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP

  let o = 12;
  for (const c of kept) {
    out.set(buf.subarray(c.start, c.start + c.total), o);
    // Se for VP8X, zera os flags de EXIF/XMP já que removemos esses chunks.
    if (c.fourcc === "VP8X") {
      out[o + 8] = out[o + 8] & ~(EXIF_FLAG | XMP_FLAG);
    }
    o += c.total;
  }
  return out;
}
