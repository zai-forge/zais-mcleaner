// Área de soltar/selecionar arquivos. Mobile-first: o toque abre o seletor
// (inclusive a galeria/câmera no celular).
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UploadIcon } from "./icons";
import { IMAGE_EXTS, VIDEO_EXTS } from "../core/types";

const ACCEPT = [...IMAGE_EXTS, ...VIDEO_EXTS].map((e) => `.${e}`).join(",");

interface Props {
  onFiles: (files: File[]) => void;
}

export default function Dropzone({ onFiles }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = (list: FileList | null) => {
    if (list && list.length) onFiles(Array.from(list));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      className={`card flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center transition
        ${over ? "ring-2 ring-brand-500 scale-[1.01]" : "hover:ring-brand-300"}`}
    >
      <div className="rounded-full bg-brand-100 p-4 text-brand-600 dark:bg-brand-700/50 dark:text-brand-200">
        <UploadIcon width={32} height={32} />
      </div>
      <div>
        <p className="text-lg font-semibold">{t("dropzone.title")}</p>
        <p className="text-sm text-brand-600 dark:text-brand-300">
          {t("dropzone.subtitle")}
        </p>
      </div>
      <p className="max-w-md text-xs text-brand-500 dark:text-brand-400">
        {t("dropzone.formats")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
