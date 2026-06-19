// Remoção SEM PERDA de metadados de JPEG.
//
// Um JPEG é uma sequência de segmentos iniciados por marcadores 0xFFxx.
// Os metadados ficam em segmentos APPn (EXIF/XMP/IPTC/ICC...) e COM (comentário).
// Removemos esses segmentos e copiamos o resto byte a byte — incluindo o scan
// comprimido (a imagem em si) — então os pixels NÃO são recomprimidos.

const isMetadataMarker = (m: number): boolean => {
  // APP1..APP15 (0xE1..0xEF): EXIF, XMP, IPTC/Photoshop, ICC, etc.
  // COM (0xFE): comentário.
  // Mantemos APP0 (0xE0, JFIF/JFXX) por compatibilidade de decodificadores —
  // não carrega dados pessoais.
  return (m >= 0xe1 && m <= 0xef) || m === 0xfe;
};

export interface JpegScan {
  /** true se há ao menos um segmento de metadados */
  hasMetadata: boolean;
  /** soma de bytes ocupados por segmentos de metadados */
  metaBytes: number;
}

/** Verifica presença de metadados sem reescrever o arquivo. */
export function scanJpeg(buf: Uint8Array): JpegScan {
  let hasMetadata = false;
  let metaBytes = 0;
  let p = 2; // pula SOI (FFD8)
  while (p + 3 < buf.length) {
    if (buf[p] !== 0xff) break;
    const marker = buf[p + 1];
    if (marker === 0xda) break; // SOS: começa o scan, fim dos metadados
    if (marker === 0xd9) break; // EOI
    // marcadores sem payload
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      p += 2;
      continue;
    }
    const len = (buf[p + 2] << 8) | buf[p + 3];
    if (len < 2) break;
    if (isMetadataMarker(marker)) {
      hasMetadata = true;
      metaBytes += 2 + len;
    }
    p += 2 + len;
  }
  return { hasMetadata, metaBytes };
}

/** Reescreve o JPEG sem os segmentos de metadados. Lança em arquivo inválido. */
export function stripJpeg(buf: Uint8Array): Uint8Array {
  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("not a jpeg");
  }
  const out: number[] = [0xff, 0xd8];
  let p = 2;
  while (p + 1 < buf.length) {
    if (buf[p] !== 0xff) {
      // dessincronizado: copia o resto cru por segurança
      for (let i = p; i < buf.length; i++) out.push(buf[i]);
      return Uint8Array.from(out);
    }
    const marker = buf[p + 1];
    if (marker === 0xda) {
      // SOS: copia daqui até o fim (scan comprimido + EOI)
      for (let i = p; i < buf.length; i++) out.push(buf[i]);
      return Uint8Array.from(out);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(0xff, marker);
      p += 2;
      continue;
    }
    if (p + 3 >= buf.length) break;
    const len = (buf[p + 2] << 8) | buf[p + 3];
    if (len < 2) break;
    const segEnd = p + 2 + len;
    if (!isMetadataMarker(marker)) {
      for (let i = p; i < segEnd && i < buf.length; i++) out.push(buf[i]);
    }
    p = segEnd;
  }
  return Uint8Array.from(out);
}
