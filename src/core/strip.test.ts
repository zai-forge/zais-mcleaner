// Testes dos strippers contra arquivos reais com metadados injetados.
// As saídas limpas são gravadas em disco para conferência externa com exiftool.
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { scanJpeg, stripJpeg } from "./jpeg";
import { scanPng, stripPng } from "./png";
import { scanWebp, stripWebp } from "./webp";
import { scanGif, stripGif } from "./gif";

// Fixtures versionados no repo (arquivos reais com metadados injetados).
const FIX = join(dirname(fileURLToPath(import.meta.url)), "../../test/fixtures");
// Saídas limpas vão para um diretório temporário (conferíveis com exiftool).
const OUT = mkdtempSync(join(tmpdir(), "mcleaner-"));
const read = (n: string) => new Uint8Array(readFileSync(join(FIX, n)));
const write = (n: string, b: Uint8Array) => writeFileSync(join(OUT, n), b);

interface Case {
  name: string;
  out: string;
  scan: (b: Uint8Array) => { hasMetadata: boolean };
  strip: (b: Uint8Array) => Uint8Array;
  magic: number[];
}

const cases: Case[] = [
  { name: "test.jpg", out: "clean.jpg", scan: scanJpeg, strip: stripJpeg, magic: [0xff, 0xd8] },
  { name: "test.png", out: "clean.png", scan: scanPng, strip: stripPng, magic: [0x89, 0x50] },
  { name: "test.webp", out: "clean.webp", scan: scanWebp, strip: stripWebp, magic: [0x52, 0x49] },
  { name: "test.gif", out: "clean.gif", scan: scanGif, strip: stripGif, magic: [0x47, 0x49] },
];

describe("strippers de metadados", () => {
  for (const c of cases) {
    it(`${c.name}: detecta, remove e fica menor preservando o formato`, () => {
      const original = read(c.name);
      expect(c.scan(original).hasMetadata).toBe(true);

      const cleaned = c.strip(original);
      // saída válida do mesmo formato
      c.magic.forEach((b, i) => expect(cleaned[i]).toBe(b));
      // sem metadados após a limpeza (verificação interna)
      expect(c.scan(cleaned).hasMetadata).toBe(false);
      // não cresceu
      expect(cleaned.length).toBeLessThanOrEqual(original.length);

      write(c.out, cleaned);
    });
  }
});
