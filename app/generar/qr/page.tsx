"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ExtensionFunction, FileExtension, Options } from "qr-code-styling";

type QRStylingInstance = {
  append: (element: HTMLElement) => void;
  update: (options: Options) => void;
  applyExtension: (extension: ExtensionFunction) => void;
  deleteExtension: () => void;
  getRawData: (extension?: FileExtension) => Promise<Blob | Buffer | null>;
  download: (options: { name: string; extension: FileExtension }) => Promise<void> | void;
};

type DotStyle = "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
type CornerSquareStyle = "square" | "dot" | "extra-rounded" | "dots" | "rounded" | "classy" | "classy-rounded";
type CornerDotStyle = "dot" | DotStyle;
type BorderStyle = "none" | "thin" | "double" | "dashed" | "glow" | "soft";
type BorderShape = "square" | "rounded";

type QrCustomizerState = {
  data: string;
  width: string;
  height: string;
  lockAspectRatio: boolean;
  padding: number;
  dotsType: DotStyle;
  cornerSquareType: CornerSquareStyle;
  cornerDotType: CornerDotStyle;
  qrColor: string;
  cornerSquareColor: string;
  cornerDotColor: string;
  backgroundColor: string;
  transparentBackground: boolean;
  borderStyle: BorderStyle;
  borderColor: string;
  borderWidth: string;
  borderShape: BorderShape;
  borderRadius: string;
  logoSize: number;
};

const INITIAL_STATE: QrCustomizerState = {
  data: "https://www.example.com/",
  width: "300",
  height: "300",
  lockAspectRatio: true,
  padding: 12,
  dotsType: "rounded",
  cornerSquareType: "extra-rounded",
  cornerDotType: "dot",
  qrColor: "#00d8ff",
  cornerSquareColor: "#00d8ff",
  cornerDotColor: "#00d8ff",
  backgroundColor: "#ffffff",
  transparentBackground: true,
  borderStyle: "thin",
  borderColor: "#00d8ff",
  borderWidth: "5",
  borderShape: "rounded",
  borderRadius: "18",
  logoSize: 0.22,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDimension(value: string | number | null | undefined, fallback: number): number {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value);

  if (normalized.trim() === "") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? clamp(parsed, 160, 1000) : fallback;
}

function parseDecimal(value: string | number | null | undefined, fallback: number, min: number, max: number): number {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value);

  if (normalized.trim() === "") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export default function QrCustomizerPage() {
  const [state, setState] = useState<QrCustomizerState>(INITIAL_STATE);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [downloadName, setDownloadName] = useState("qr-personalizado");
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrInstanceRef = useRef<QRStylingInstance | null>(null);

  const frameExtension = useMemo<ExtensionFunction>(() => {
    return (svg, options) => {
      if (state.borderStyle === "none") {
        return;
      }

      const width = Number(options.width || 0);
      const height = Number(options.height || 0);
      const color = state.borderColor;
      const previewWidth = parseDimension(state.width, 300);
      const scaleFactor = previewWidth > 0 ? width / previewWidth : 1;
      const strokeWidthBase = parseDecimal(state.borderWidth, 2, 1, 12);
      const strokeWidth = strokeWidthBase * scaleFactor;
      const paddingPx = parseDecimal(state.padding, 12, 0, 50) * scaleFactor;
      const radiusBase = state.borderShape === "square" ? 0 : parseDecimal(state.borderRadius, 18, 0, 80);
      const radius = radiusBase * scaleFactor;
      const ns = "http://www.w3.org/2000/svg";

      const applyBase = (rect: SVGRectElement, stroke: number) => {
        // Border starts at the outer edge; QR spacing is controlled by qrOptions.margin (padding).
        const x = stroke / 2;
        const y = stroke / 2;
        const rectWidth = Math.max(0, width - x * 2);
        const rectHeight = Math.max(0, height - y * 2);

        rect.setAttribute("x", String(x));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(rectWidth));
        rect.setAttribute("height", String(rectHeight));
        rect.setAttribute("rx", String(radius));
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", color);
        rect.setAttribute("stroke-width", String(stroke));
      };

      if (state.borderStyle === "thin") {
        const rect = document.createElementNS(ns, "rect");
        applyBase(rect, Math.max(strokeWidth, 5 * scaleFactor));
        rect.setAttribute("opacity", "1");
        svg.appendChild(rect);
        return;
      }

      if (state.borderStyle === "dashed") {
        const rect = document.createElementNS(ns, "rect");
        applyBase(rect, strokeWidth);
        rect.setAttribute("stroke-dasharray", `${10 * scaleFactor} ${7 * scaleFactor}`);
        svg.appendChild(rect);
        return;
      }

      if (state.borderStyle === "double") {
        const outer = document.createElementNS(ns, "rect");
        applyBase(outer, Math.max(1, strokeWidth * 0.7));
        const inner = document.createElementNS(ns, "rect");
        const innerInset = (paddingPx + 4 + strokeWidthBase) * scaleFactor;
        inner.setAttribute("x", String(innerInset));
        inner.setAttribute("y", String(innerInset));
        inner.setAttribute("width", String(Math.max(0, width - innerInset * 2)));
        inner.setAttribute("height", String(Math.max(0, height - innerInset * 2)));
        inner.setAttribute("rx", String(radius));
        inner.setAttribute("fill", "none");
        inner.setAttribute("stroke", color);
        inner.setAttribute("stroke-width", String(Math.max(1, strokeWidth * 0.55)));
        inner.setAttribute("opacity", "0.85");
        svg.appendChild(outer);
        svg.appendChild(inner);
        return;
      }

      if (state.borderStyle === "glow") {
        const rect = document.createElementNS(ns, "rect");
        applyBase(rect, strokeWidth);
        rect.setAttribute("filter", "drop-shadow(0 0 5px rgba(15, 118, 110, 0.65))");
        svg.appendChild(rect);
        return;
      }

      const rect = document.createElementNS(ns, "rect");
      applyBase(rect, strokeWidth);
      rect.setAttribute("opacity", "0.55");
      svg.appendChild(rect);
    };
  }, [state.borderColor, state.borderRadius, state.borderShape, state.borderStyle, state.borderWidth, state.padding, state.width]);

  const qrOptions = useMemo<Options>(() => {
    const safeSize = clamp(state.logoSize, 0.12, 0.35);
    const width = parseDimension(state.width, 360);
    const height = parseDimension(state.height, 360);

    return {
      width,
      height,
      type: "svg",
      data: state.data || "https://www.example.com/",
      margin: state.padding,
      image: logoDataUrl || undefined,
      qrOptions: {
        errorCorrectionLevel: "H",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 6,
        imageSize: safeSize,
        hideBackgroundDots: true,
      },
      dotsOptions: {
        type: state.dotsType,
        color: state.qrColor,
      },
      cornersSquareOptions: {
        type: state.cornerSquareType,
        color: state.cornerSquareColor,
      },
      cornersDotOptions: {
        type: state.cornerDotType,
        color: state.cornerDotColor,
      },
      backgroundOptions: {
        color: state.transparentBackground ? "transparent" : state.backgroundColor,
      },
    };
  }, [state, logoDataUrl]);

  useEffect(() => {
    let cancelled = false;

    if (qrInstanceRef.current) {
      return;
    }

    void (async () => {
      try {
        const { default: QRCodeStyling } = await import("qr-code-styling");
        if (cancelled || !containerRef.current) {
          return;
        }

        const instance = new QRCodeStyling(qrOptions);
        containerRef.current.innerHTML = "";
        instance.append(containerRef.current);
        qrInstanceRef.current = instance as unknown as QRStylingInstance;

        if (state.borderStyle === "none") {
          qrInstanceRef.current.deleteExtension();
        } else {
          qrInstanceRef.current.applyExtension(frameExtension);
        }

        setIsReady(true);
      } catch {
        if (!cancelled) {
          setErrorMessage("No se pudo inicializar el motor de QR.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frameExtension, qrOptions, state.borderStyle]);

  useEffect(() => {
    if (!qrInstanceRef.current) {
      return;
    }

    qrInstanceRef.current.update(qrOptions);

    if (state.borderStyle === "none") {
      qrInstanceRef.current.deleteExtension();
    } else {
      qrInstanceRef.current.applyExtension(frameExtension);
    }
  }, [frameExtension, qrOptions, state.borderStyle]);

  const onTextChange = (key: keyof QrCustomizerState, value: string) => {
    setState((prev) => ({ ...prev, [key]: value } as QrCustomizerState));
  };

  const onNumberChange = (key: keyof QrCustomizerState, value: string, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
    setState((prev) => ({ ...prev, [key]: safeValue }));
  };

  const onWidthOrHeightChange = (key: "width" | "height", value: string) => {
    setState((prev) => {
      if (prev.lockAspectRatio) {
        return { ...prev, width: value, height: value };
      }

      return { ...prev, [key]: value };
    });
  };

  const onLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const asDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el logo"));
      reader.readAsDataURL(file);
    });

    setLogoDataUrl(asDataUrl);
  };

  const clearLogo = () => {
    setLogoDataUrl("");
  };

  const downloadQr = async (extension: FileExtension) => {
    if (!qrInstanceRef.current) {
      return;
    }

    if (extension === "png") {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const baseWidth = parseDimension(state.width, 300);
      const baseHeight = parseDimension(state.height, 300);
      const scale = 4;
      const hiResOptions: Options = {
        ...qrOptions,
        width: baseWidth * scale,
        height: baseHeight * scale,
        margin: state.padding * scale,
      };

      const hiResQr = new QRCodeStyling(hiResOptions) as unknown as QRStylingInstance;
      if (state.borderStyle !== "none") {
        hiResQr.applyExtension(frameExtension);
      }

      const rawData = await hiResQr.getRawData("png");
      if (rawData && typeof Blob !== "undefined" && rawData instanceof Blob) {
        const url = URL.createObjectURL(rawData);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${downloadName.trim() || "qr-personalizado"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }

    await qrInstanceRef.current.download({
      name: downloadName.trim() || "qr-personalizado",
      extension,
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 lg:px-10">
      <div className="blob-bg -left-14 top-8 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-12 top-20 h-64 w-64 bg-emerald-300/60 [animation-delay:1s]" />
      <div className="blob-bg bottom-10 left-1/3 h-48 w-48 bg-sky-300/60 [animation-delay:1.8s]" />

      <section className="fade-rise relative mx-auto grid w-full max-w-7xl gap-6 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_-40px_rgba(6,95,70,0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] sm:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-teal-700 uppercase">Diseñador de QR</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">QR personalizable</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Crea códigos QR con un diseño profesional y totalmente personalizable.. <br />
                Descarga en alta calidad, listos para usar en cualquier medio..
              </p>
            </div>

            <Link
              href="/generar"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
            >
              Volver a opciones
            </Link>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Texto o enlace</span>
            <textarea
              rows={3}
              value={state.data}
              onChange={(e) => onTextChange("data", e.target.value)}
              placeholder="https://tu-link.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
              <NumberInput label="Ancho" value={state.width} onChange={(value) => onWidthOrHeightChange("width", value)} />
              <button
                type="button"
                onClick={() => setState((prev) => ({ ...prev, lockAspectRatio: !prev.lockAspectRatio }))}
                className="mt-[1.55rem] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-teal-500 hover:text-teal-700"
                aria-label={state.lockAspectRatio ? "Desbloquear proporción" : "Bloquear proporción"}
                title={state.lockAspectRatio ? "Desbloquear proporción" : "Bloquear proporción"}
              >
                {state.lockAspectRatio ? <ChainLockedIcon /> : <ChainUnlockedIcon />}
              </button>
              <NumberInput label="Alto" value={state.height} onChange={(value) => onWidthOrHeightChange("height", value)} />
            </div>
            <NumberInput label="Padding" value={state.padding} onChange={(value) => onNumberChange("padding", value, 10, 0, 50)} />
          </div>

          <p className="text-xs text-slate-500">
            El padding define el espacio interno entre el borde y el QR.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <SelectInput
              label="Puntos"
              value={state.dotsType}
              onChange={(value) => onTextChange("dotsType", value)}
              options={[
                ["dots", "Dots"],
                ["rounded", "Rounded"],
                ["extra-rounded", "Extra rounded"],
                ["classy", "Classy"],
                ["classy-rounded", "Classy rounded"],
                ["square", "Square"],
              ]}
            />
            <SelectInput
              label="Esquina externa"
              value={state.cornerSquareType}
              onChange={(value) => onTextChange("cornerSquareType", value)}
              options={[
                ["extra-rounded", "Extra rounded"],
                ["rounded", "Rounded"],
                ["dots", "Dots"],
                ["classy", "Classy"],
                ["classy-rounded", "Classy rounded"],
                ["dot", "Dot"],
                ["square", "Square"],
              ]}
            />
            <SelectInput
              label="Esquina interna"
              value={state.cornerDotType}
              onChange={(value) => onTextChange("cornerDotType", value)}
              options={[
                ["dots", "Dots"],
                ["rounded", "Rounded"],
                ["extra-rounded", "Extra rounded"],
                ["classy", "Classy"],
                ["classy-rounded", "Classy rounded"],
                ["dot", "Dot"],
                ["square", "Square"],
              ]}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ColorInput label="Color QR" value={state.qrColor} onChange={(value) => onTextChange("qrColor", value)} />
            <ColorInput label="Esquina ext." value={state.cornerSquareColor} onChange={(value) => onTextChange("cornerSquareColor", value)} />
            <ColorInput label="Esquina int." value={state.cornerDotColor} onChange={(value) => onTextChange("cornerDotColor", value)} />
          </div>

          {!state.transparentBackground && (
            <ColorInput
              label="Fondo"
              value={state.backgroundColor}
              onChange={(value) => onTextChange("backgroundColor", value)}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <SelectInput
              label="Borde minimalista"
              value={state.borderStyle}
              onChange={(value) => onTextChange("borderStyle", value)}
              options={[
                ["none", "Sin borde"],
                ["soft", "Soft"],
                ["thin", "Thin"],
                ["dashed", "Dashed"],
                ["double", "Double"],
                ["glow", "Glow"],
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberInput
                label="Ancho borde"
                value={state.borderWidth}
                onChange={(value) => onTextChange("borderWidth", value.replace(/[^0-9]/g, ""))}
              />
              <SelectInput
                label="Forma borde"
                value={state.borderShape}
                onChange={(value) => onTextChange("borderShape", value)}
                options={[
                  ["rounded", "Redondo"],
                  ["square", "Cuadrado"],
                ]}
              />
              <NumberInput
                label="Redondeo"
                value={state.borderRadius}
                onChange={(value) => onTextChange("borderRadius", value.replace(/[^0-9]/g, ""))}
                disabled={state.borderShape === "square"}
              />
            </div>
          </div>

          <ColorInput
            label="Color borde"
            value={state.borderColor}
            onChange={(value) => onTextChange("borderColor", value)}
            disabled={state.borderStyle === "none"}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.transparentBackground}
              onChange={(e) => setState((prev) => ({ ...prev, transparentBackground: e.target.checked }))}
            />
            Fondo transparente
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Logo al centro (opcional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,.ico"
                onChange={onLogoUpload}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-500"
              />
            </label>

            <button
              type="button"
              onClick={clearLogo}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
            >
              Quitar logo
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Tamaño del logo</span>
              <input
                type="range"
                min="12"
                max="35"
                step="1"
                value={Math.round(state.logoSize * 100)}
                onChange={(e) => setState((prev) => ({ ...prev, logoSize: Number(e.target.value) / 100 }))}
                className="w-full accent-teal-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>Pequeño</span>
                <span>{Math.round(state.logoSize * 100)}%</span>
                <span>Grande</span>
              </div>
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Ajusta el logo después de cargarlo; el cambio se ve en vivo.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Nombre del archivo</span>
              <input
                type="text"
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>
            <button
              type="button"
              onClick={() => void downloadQr("png")}
              disabled={!isReady}
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Descargar PNG
            </button>
            <button
              type="button"
              onClick={() => void downloadQr("svg")}
              disabled={!isReady}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Descargar SVG
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-800">Vista previa</p>
          <div
            className="grid place-items-center rounded-2xl border border-dashed border-slate-300 p-4"
            style={{
              minHeight: "420px",
              background: state.transparentBackground
                ? "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)"
                : "#f8fafc",
              backgroundSize: state.transparentBackground ? "18px 18px" : undefined,
              backgroundPosition: state.transparentBackground ? "0 0, 0 9px, 9px -9px, -9px 0" : undefined,
            }}
          >
            <div ref={containerRef} />
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <p>Tip: carga un logo con fondo transparente (PNG o SVG), evita detalles muy pequeños y usa buen contraste para mejor lectura al escanear.</p>
            {errorMessage && <p className="font-semibold text-rose-700">{errorMessage}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const normalizedValue = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function ChainLockedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 13.5 8 16a3.5 3.5 0 1 1-5-5l2.5-2.5" />
      <path d="M13.5 10.5 16 8a3.5 3.5 0 1 1 5 5l-2.5 2.5" />
      <path d="M9 15l6-6" />
    </svg>
  );
}

function ChainUnlockedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 12.5 5 15a3.5 3.5 0 1 1-5-5L2.5 7.5" />
      <path d="M16.5 11.5 19 9a3.5 3.5 0 1 1 5 5L21.5 16.5" />
      <path d="M9 15l2-2" />
      <path d="M15 9l-2 2" />
    </svg>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <div className={`flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 ${disabled ? "bg-slate-100" : "bg-white"}`}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-sm text-slate-800 outline-none"
        />
      </div>
    </label>
  );
}
