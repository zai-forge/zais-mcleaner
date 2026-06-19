# Zai's MCleaner

> Remove os metadados de imagens e vídeos antes de compartilhar.
> **Tudo acontece no seu aparelho — nada é enviado para a internet.**
>
> _Strip metadata from images and videos before sharing. Everything runs on your
> device — nothing is uploaded._

App multiplataforma (Web/PWA · Android · Windows) construído com **Tauri v2 +
React**. Sucessor com interface gráfica do script `clean-meta.sh`.

🇧🇷 Português (principal) · 🇬🇧 English below

---

## 🇧🇷 Português

### O que faz
- **Imagens** (JPG, PNG, GIF, WebP): remove EXIF, GPS, XMP, IPTC, comentários e
  data/hora **sem recomprimir** os pixels (limpeza sem perda).
- **Vídeos** (MP4, WebM, MOV): re-codifica apagando todos os metadados **e a
  impressão digital do codificador original** (via ffmpeg.wasm).
- **Verificação automática**: cada imagem é reanalisada após a limpeza para
  confirmar que não sobrou metadado sensível.
- **Detecção prévia**: mostra o que estava escondido (localização, câmera, data,
  software) antes de limpar.
- **Privacidade real**: o processamento é 100% local (WebAssembly no navegador /
  app). Nenhum arquivo sai do seu aparelho.

### Como usar
- **Web/PWA** (mais fácil de compartilhar): abra o link publicado no GitHub Pages.
  No celular, dá para "Adicionar à tela inicial" e usar como app.
- **Android**: instale o APK da página de [Releases](../../releases).
- **Windows**: instale o `.msi` ou `.exe` da página de Releases.

Fluxo: selecione/solte os arquivos → veja os metadados detectados → **Limpar
tudo** (com barra de progresso) → **baixar** ou **compartilhar**.

### Desenvolvimento
```bash
npm install
npm run dev        # web em http://localhost:5173
npm run build      # build de produção (pasta dist/)
npm test           # testes dos strippers
npm run tauri dev  # app desktop (requer dependências do Tauri/webkit)
```

### Formatos
| Tipo | Formatos | Método |
|---|---|---|
| Imagem | JPG, PNG, GIF, WebP | strip sem perda (no navegador) |
| Imagem | BMP | sem metadados padronizados (passa direto) |
| Imagem | TIFF | tratado na versão desktop (exiftool); limitado na web |
| Vídeo | MP4, WebM, MOV | re-encode via ffmpeg.wasm |

### Limitações conhecidas
- Vídeos no celular são **lentos e pesados de memória** (re-encode em WebAssembly).
- O motor de vídeo (~30 MB) é baixado sob demanda no primeiro vídeo.
- TIFF não tem limpeza sem perda confiável no navegador (use a versão desktop).

---

## 🇬🇧 English

### What it does
- **Images** (JPG, PNG, GIF, WebP): strips EXIF, GPS, XMP, IPTC, comments and
  timestamps **without recompressing** the pixels (lossless).
- **Videos** (MP4, WebM, MOV): re-encodes, erasing all metadata **and the
  original encoder fingerprint** (via ffmpeg.wasm).
- **Automatic verification**: each image is re-scanned after cleaning to confirm
  no sensitive metadata remains.
- **Up-front detection**: shows what was hidden (location, camera, date,
  software) before cleaning.
- **Real privacy**: processing is 100% local (WebAssembly in the browser/app).
  No file ever leaves your device.

### How to use
- **Web/PWA** (easiest to share): open the GitHub Pages link. On mobile you can
  "Add to home screen" and use it like an app.
- **Android**: install the APK from [Releases](../../releases).
- **Windows**: install the `.msi`/`.exe` from Releases.

### Development
```bash
npm install
npm run dev        # web at http://localhost:5173
npm run build      # production build (dist/)
npm test           # stripper tests
npm run tauri dev  # desktop app (needs Tauri/webkit deps)
```

---

## Arquitetura / Architecture

- **`src/core/`** — núcleo de limpeza. Strippers byte a byte por formato
  (`jpeg.ts`, `png.ts`, `webp.ts`, `gif.ts`), `cleanVideo.ts` (ffmpeg.wasm),
  `detect.ts` e `cleanImage.ts` (com verificação). Interface única em `index.ts`.
- **`src/platform/`** — decide entre download/Web Share (navegador) e diálogo
  nativo de salvar (Tauri). A mesma UI roda em tudo.
- **`src-tauri/`** — shell Tauri v2 (Android + Windows). O backend Rust só
  registra os plugins de diálogo/arquivo; toda a limpeza é no webview.
- **CI** (`.github/workflows/`): `deploy-web.yml` publica no GitHub Pages a cada
  push na `main`; `build-apps.yml` gera APK e instalador Windows numa Release
  (dispare com `git tag v0.1.0 && git push --tags`).

> **GitHub Pages**: em _Settings → Pages_, escolha **Source: GitHub Actions**.
> O motor de vídeo usa o core **single-thread** do ffmpeg, então funciona no
> Pages sem precisar de headers de cross-origin isolation.

### Compilando para Android (Linux)
```bash
# requer Android SDK + NDK e Rust com os alvos android
npm run tauri android init
npm run tauri android build -- --apk
```
> iOS está fora do escopo por enquanto (exige macOS para compilar).

## Licença / License
Defina antes de publicar (sugestão: MIT). / Pick before publishing (suggest MIT).
