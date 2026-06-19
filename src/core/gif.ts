// Remoção SEM PERDA de metadados de GIF.
//
// Removemos blocos de Comentário (0x21 0xFE), Texto Simples (0x21 0x01) e
// Extensões de Aplicação XMP. Mantemos Graphic Control, descritores de imagem
// e a extensão NETSCAPE (loop de animação).

function isGif(buf: Uint8Array): boolean {
  if (buf.length < 6) return false;
  const sig = String.fromCharCode(...buf.subarray(0, 6));
  return sig === "GIF87a" || sig === "GIF89a";
}

// Lê uma cadeia de sub-blocos a partir de `p`, retorna a posição após o
// terminador 0x00.
function skipSubBlocks(buf: Uint8Array, p: number): number {
  while (p < buf.length) {
    const size = buf[p];
    p += 1;
    if (size === 0) break;
    p += size;
  }
  return p;
}

interface GifWalk {
  hasMetadata: boolean;
  metaBytes: number;
  /** trechos a manter, na ordem */
  keep: Array<[number, number]>;
}

function walk(buf: Uint8Array): GifWalk {
  let p = 6; // header
  // Logical Screen Descriptor
  const packed = buf[10];
  p = 13;
  if (packed & 0x80) {
    const gctSize = 3 * (1 << ((packed & 0x07) + 1));
    p += gctSize;
  }
  const keep: Array<[number, number]> = [[0, p]]; // header + LSD + GCT
  let hasMetadata = false;
  let metaBytes = 0;

  while (p < buf.length) {
    const b = buf[p];
    if (b === 0x3b) {
      keep.push([p, 1]); // trailer
      p += 1;
      break;
    }
    if (b === 0x2c) {
      // Image Descriptor
      const start = p;
      const lpacked = buf[p + 9];
      p += 10;
      if (lpacked & 0x80) {
        const lctSize = 3 * (1 << ((lpacked & 0x07) + 1));
        p += lctSize;
      }
      p += 1; // LZW minimum code size
      p = skipSubBlocks(buf, p);
      keep.push([start, p - start]);
      continue;
    }
    if (b === 0x21) {
      const label = buf[p + 1];
      const start = p;
      let remove = false;
      if (label === 0xfe || label === 0x01) {
        remove = true; // comentário / texto simples
        p += 2;
        if (label === 0x01) p += buf[p] + 1; // bloco de cabeçalho do plain text
        p = skipSubBlocks(buf, p);
      } else if (label === 0xff) {
        // Application Extension: 0x21 0xFF 0x0B <11 bytes id+auth> sub-blocos
        const idLen = buf[p + 2];
        const id = String.fromCharCode(...buf.subarray(p + 3, p + 3 + idLen));
        p += 3 + idLen;
        p = skipSubBlocks(buf, p);
        if (id.startsWith("XMP Data")) remove = true;
      } else {
        // Graphic Control (0xF9) e outras extensões: mantém.
        // skipSubBlocks percorre os sub-blocos e consome o terminador 0x00.
        p += 2;
        p = skipSubBlocks(buf, p);
      }
      const len = p - start;
      if (remove) {
        hasMetadata = true;
        metaBytes += len;
      } else {
        keep.push([start, len]);
      }
      continue;
    }
    // byte inesperado: aborta para não corromper
    throw new Error("gif parse error");
  }
  return { hasMetadata, metaBytes, keep };
}

export function scanGif(buf: Uint8Array): { hasMetadata: boolean; metaBytes: number } {
  if (!isGif(buf)) throw new Error("not a gif");
  const w = walk(buf);
  return { hasMetadata: w.hasMetadata, metaBytes: w.metaBytes };
}

export function stripGif(buf: Uint8Array): Uint8Array {
  if (!isGif(buf)) throw new Error("not a gif");
  const { keep } = walk(buf);
  let size = 0;
  for (const [, len] of keep) size += len;
  const out = new Uint8Array(size);
  let o = 0;
  for (const [start, len] of keep) {
    out.set(buf.subarray(start, start + len), o);
    o += len;
  }
  return out;
}
