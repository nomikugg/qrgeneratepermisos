'use client';

import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { useEffect, useMemo, useState } from "react";
import {
  buildQrCleanupMask,
  buildQrPlacementFromDetectedImages,
  buildPermitFieldsFromDetectedBlocks,
  createDefaultPdfLayout,
  normalizePdfLayoutConfig,
  type PdfBaseTextEdit,
  type PdfLayoutConfig,
} from "@/lib/pdfLayout";

type BackendPdfTextBox = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type BackendPdfAnalyzeResponse = {
  pages: Array<{
    page: number;
    texts: BackendPdfTextBox[];
    images: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  }>;
};

type BackendPdfApplyResponse = {
  fileId: string;
};

const PDF_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_PDF_BACKEND_URL ?? "http://127.0.0.1:8080";

function buildPdfBackendUrl(pathname: string): string {
  return new URL(pathname, PDF_BACKEND_BASE_URL).toString();
}

function backendTextBoxToBaseTextEdit(textBox: BackendPdfTextBox, page: number): PdfBaseTextEdit {
  const text = String(textBox.text ?? "").trim();

  return {
    id: crypto.randomUUID(),
    page,
    originalText: text,
    text,
    x: Math.max(0, Math.round(textBox.x)),
    y: Math.max(0, Math.round(textBox.y)),
    width: Math.max(24, Math.round(textBox.width)),
    height: Math.max(12, Math.round(textBox.height)),
    fontSize: Math.max(6, Math.round(Math.max(8, textBox.height * 0.85))),
    color: "#111111",
    fontFamily: "helvetica",
    bold: false,
  };
}

async function uploadPdfToBackend(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildPdfBackendUrl("/pdf/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo subir el PDF al backend.");
  }

  const payload = (await response.json()) as { fileId?: string };
  if (!payload.fileId) {
    throw new Error("El backend no devolvio fileId.");
  }

  return payload.fileId;
}

async function analyzePdfOnBackend(fileId: string): Promise<BackendPdfAnalyzeResponse> {
  const response = await fetch(buildPdfBackendUrl("/pdf/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo analizar el PDF en el backend.");
  }

  return (await response.json()) as BackendPdfAnalyzeResponse;
}

async function applyPdfEditsOnBackend(
  fileId: string,
  operations: Array<{
    type: "replace";
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    newText: string;
    targetText?: string;
  }>
): Promise<string> {
  const response = await fetch(buildPdfBackendUrl("/pdf/apply"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, operations }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo aplicar la edicion en el backend.");
  }

  const payload = (await response.json()) as BackendPdfApplyResponse;
  if (!payload.fileId) {
    throw new Error("El backend no devolvio el nuevo fileId.");
  }

  return payload.fileId;
}

async function downloadPdfFromBackend(fileId: string, filename: string): Promise<void> {
  const response = await fetch(buildPdfBackendUrl(`/pdf/download?fileId=${encodeURIComponent(fileId)}`));

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo descargar el PDF editado.");
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function parseNumberField(value: string | number | null | undefined, fallback: number): number {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value);

  if (normalized.trim() === "") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

export default function PdfGeneratorPage() {
  const [templatePdf, setTemplatePdf] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [layout, setLayout] = useState<PdfLayoutConfig>(createDefaultPdfLayout());
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [templatePageSize, setTemplatePageSize] = useState<{ width: number; height: number } | null>(null);
  const [backendPdfFileId, setBackendPdfFileId] = useState<string | null>(null);
  const [backendPdfStatus, setBackendPdfStatus] = useState<"idle" | "uploading" | "analyzing" | "ready" | "error">("idle");
  const [selectedBaseTextId, setSelectedBaseTextId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const selectedBaseText = layout.baseTextEdits.find((edit) => edit.id === selectedBaseTextId) ?? null;

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/pdf-layout", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as { layout?: unknown };
          if (payload.layout) {
            setLayout(normalizePdfLayoutConfig(payload.layout));
          }
        }
      } catch {
        // Keep defaults.
      }
    })();
  }, []);

  useEffect(() => {
    if (!templatePdf) {
      setPreviewPdfUrl("");
      setTemplatePageSize(null);
      setBackendPdfFileId(null);
      setBackendPdfStatus("idle");
      return;
    }

    const previewUrl = URL.createObjectURL(templatePdf);
    setPreviewPdfUrl(previewUrl);

    let cancelled = false;

    void (async () => {
      const templateBuffer = await templatePdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const firstPage = pdfDoc.getPages()[0];

      if (firstPage && !cancelled) {
        const pageWidth = firstPage.getWidth();
        const pageHeight = firstPage.getHeight();
        setTemplatePageSize({ width: pageWidth, height: pageHeight });
        setLayout((current) => ({
          ...current,
          pageWidth,
          pageHeight,
        }));
      }

      try {
        if (!cancelled) {
          setBackendPdfStatus("uploading");
        }

        const backendFileId = await uploadPdfToBackend(templatePdf);
        if (cancelled) {
          return;
        }

        setBackendPdfFileId(backendFileId);
        setBackendPdfStatus("analyzing");

        const analysis = await analyzePdfOnBackend(backendFileId);
        if (cancelled) {
          return;
        }

        const detectedBlocks = analysis.pages.flatMap((page) =>
          page.texts.map((textBox) => ({
            page: page.page,
            text: textBox.text,
            x: textBox.x,
            y: textBox.y,
            width: textBox.width,
            height: textBox.height,
          }))
        );
        const detectedImages = analysis.pages.flatMap((page) =>
          (page.images ?? []).map((image) => ({
            page: page.page,
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
          }))
        );

        const backendEdits = detectedBlocks.slice(0, 250).map((textBox) => backendTextBoxToBaseTextEdit(textBox, textBox.page));
        const detectedFields = buildPermitFieldsFromDetectedBlocks(detectedBlocks);
        const qrCleanupMask = buildQrCleanupMask(detectedImages);

        setLayout((current) => ({
          ...current,
          baseTextEdits: backendEdits,
          fields: detectedFields.length > 0 ? detectedFields : current.fields,
          qr: buildQrPlacementFromDetectedImages(detectedImages, current.qr),
          masks: qrCleanupMask
            ? [
              ...current.masks.filter((mask) => mask.id !== "auto-qr-cleanup"),
              qrCleanupMask,
            ]
            : current.masks,
        }));

        setBackendPdfStatus("ready");
        if (backendEdits.length === 0) {
          setMessage(
            "PDF cargado, pero no se detectaron campos de texto editables. Puede ser un PDF escaneado o con texto convertido a imagen."
          );
        } else {
          const mappedFieldsMsg = detectedFields.length > 0
            ? ` y ${detectedFields.length} campos quedaron anclados por posicion`
            : "";
          const mappedQrMsg = qrCleanupMask ? "; QR detectado y anclado automaticamente" : "";
          setMessage(`PDF cargado y analizado. Se detectaron ${backendEdits.length} bloques de texto${mappedFieldsMsg}${mappedQrMsg}.`);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendPdfStatus("error");
          setMessage(error instanceof Error ? error.message : "No se pudo conectar al backend de PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(previewUrl);
    };
  }, [templatePdf]);

  const previewBaseTextEdits = useMemo(
    () => layout.baseTextEdits.map((edit) => ({ ...edit, boxHeight: Math.max(12, edit.height) })),
    [layout.baseTextEdits]
  );

  const replaceBaseTextEdit = (id: string, patch: Partial<PdfBaseTextEdit>) => {
    setLayout((current) => ({
      ...current,
      baseTextEdits: current.baseTextEdits.map((edit) => (edit.id === id ? { ...edit, ...patch } : edit)),
    }));
  };

  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    setMessage("Guardando layout...");

    try {
      const response = await fetch("/api/pdf-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo guardar el layout.");
      }

      setMessage("Layout guardado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error guardando el layout.");
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleApplyBackendEdits = async () => {
    if (!templatePdf || !backendPdfFileId) {
      setMessage("Primero carga un PDF base.");
      return;
    }

    const operations = layout.baseTextEdits
      .filter((edit) => edit.originalText && edit.text.trim() !== edit.originalText.trim())
      .map((edit) => ({
        type: "replace" as const,
        page: Math.max(0, Math.floor(edit.page ?? 0)),
        x: edit.x,
        y: edit.y,
        width: edit.width,
        height: edit.height,
        newText: edit.text,
        targetText: edit.originalText,
      }));

    if (operations.length === 0) {
      setMessage("No hay cambios de texto para aplicar.");
      return;
    }

    setIsApplyingEdits(true);
    setMessage("Aplicando ediciones al PDF...");

    try {
      const modifiedFileId = await applyPdfEditsOnBackend(backendPdfFileId, operations);
      const baseName = templatePdf.name.replace(/\.pdf$/i, "") || "pdf-editado";
      await downloadPdfFromBackend(modifiedFileId, `${baseName}-editado.pdf`);
      setMessage("PDF editado descargado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar el PDF editado.");
    } finally {
      setIsApplyingEdits(false);
    }
  };

  const handleGenerateBatchFromCsv = async () => {
    if (!csvFile) {
      setMessage("Debes cargar un CSV para generar el lote PDF.");
      return;
    }

    setIsGeneratingBatch(true);
    setMessage("Generando lote PDF desde CSV...");

    try {
      const formData = new FormData();
      formData.append("csvFile", csvFile);
      if (templatePdf) {
        formData.append("templatePdf", templatePdf);
      }
      formData.append("layoutConfig", JSON.stringify(layout));
      formData.append("qrX", String(layout.qr.x));
      formData.append("qrY", String(layout.qr.y));
      formData.append("qrWidth", String(layout.qr.width));
      formData.append("qrHeight", String(layout.qr.height));

      const response = await fetch("/api/generate-pdf-batch", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo generar el ZIP de PDFs.");
      }

      const zipBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "permisos-pdf.zip";
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setMessage("ZIP generado correctamente con el layout activo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error generando lote PDF desde CSV.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const pageWidth = templatePageSize?.width ?? layout.pageWidth;
  const pageHeight = templatePageSize?.height ?? layout.pageHeight;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
          <div>
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-cyan-700 uppercase">
              Editor PDF
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Editar PDF con backend Rust</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Carga un PDF, el backend extrae el texto y luego puedes editarlo y descargar la versión final sin usar PDF.js en el navegador.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={isSavingLayout}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {isSavingLayout ? "Guardando..." : "Guardar layout"}
            </button>
            <Link
              href="/generar"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            >
              Volver
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mb-2 block text-sm font-semibold text-slate-800">PDF base</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setTemplatePdf(event.target.files?.[0] ?? null)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-500"
                />
              </label>

              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mb-2 block text-sm font-semibold text-slate-800">CSV para lote PDF</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Usa columnas como: placa, modelo, marca, anio, color, licencia, conductor, solicitante, institucion.
                </p>
              </label>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 text-sm text-cyan-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wide">Estado</span>
                  <span>{backendPdfStatus}</span>
                </div>
                <p className="mt-2 break-all text-[11px] text-cyan-800/80">
                  {backendPdfFileId ? `fileId: ${backendPdfFileId}` : "Todavia no hay PDF cargado al backend."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Ancho</span>
                  <input
                    type="text"
                    value={formatNumber(pageWidth)}
                    onChange={(event) => setLayout((current) => ({ ...current, pageWidth: parseNumberField(event.target.value, current.pageWidth) }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Alto</span>
                  <input
                    type="text"
                    value={formatNumber(pageHeight)}
                    onChange={(event) => setLayout((current) => ({ ...current, pageHeight: parseNumberField(event.target.value, current.pageHeight) }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleApplyBackendEdits}
                disabled={!backendPdfFileId || backendPdfStatus !== "ready" || isApplyingEdits}
                className="w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isApplyingEdits ? "Aplicando..." : "Descargar PDF editado"}
              </button>

              <button
                type="button"
                onClick={handleGenerateBatchFromCsv}
                disabled={!csvFile || isGeneratingBatch}
                className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isGeneratingBatch ? "Generando lote..." : "Generar ZIP PDF desde CSV"}
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Texto base detectado</p>
                <span className="text-[11px] text-slate-500">{previewBaseTextEdits.length} bloques</span>
              </div>

              <div className="max-h-[42vh] space-y-2 overflow-auto pr-1">
                {previewBaseTextEdits.length > 0 ? (
                  previewBaseTextEdits.map((edit, index) => (
                    <button
                      key={edit.id}
                      type="button"
                      onClick={() => setSelectedBaseTextId(edit.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedBaseTextId === edit.id ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-slate-50 hover:border-slate-400"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">
                          {index + 1}. {edit.text}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">base</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Carga un PDF base para analizar el contenido con el backend.</p>
                )}
              </div>
            </div>

            {message ? <p className="text-xs text-slate-600">{message}</p> : null}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Vista previa</p>
                <p className="text-xs text-slate-500">Sin PDF.js. El navegador muestra el PDF nativo y el backend maneja el análisis.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {Math.round(pageWidth)} x {Math.round(pageHeight)} pt
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {previewPdfUrl ? (
                  <iframe src={previewPdfUrl} title="PDF base" className="h-[72vh] w-full border-0" />
                ) : (
                  <div className="grid h-[72vh] place-items-center text-sm text-slate-500">
                    Selecciona un PDF para iniciar.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {selectedBaseText ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Editando</p>
                        <h2 className="mt-1 text-sm font-semibold text-slate-900">Bloque #{selectedBaseTextId?.slice(0, 8)}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBaseTextId(null)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Original</span>
                        <textarea value={selectedBaseText.originalText ?? ""} readOnly rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nuevo texto</span>
                        <textarea
                          value={selectedBaseText.text}
                          onChange={(event) => replaceBaseTextEdit(selectedBaseText.id, { text: event.target.value })}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">X</span>
                          <input type="text" value={formatNumber(selectedBaseText.x)} onChange={(event) => replaceBaseTextEdit(selectedBaseText.id, { x: parseNumberField(event.target.value, selectedBaseText.x) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Y</span>
                          <input type="text" value={formatNumber(selectedBaseText.y)} onChange={(event) => replaceBaseTextEdit(selectedBaseText.id, { y: parseNumberField(event.target.value, selectedBaseText.y) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Ancho</span>
                          <input type="text" value={formatNumber(selectedBaseText.width)} onChange={(event) => replaceBaseTextEdit(selectedBaseText.id, { width: parseNumberField(event.target.value, selectedBaseText.width) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Alto</span>
                          <input type="text" value={formatNumber(selectedBaseText.height)} onChange={(event) => replaceBaseTextEdit(selectedBaseText.id, { height: parseNumberField(event.target.value, selectedBaseText.height) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500" />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Selecciona un bloque del texto base para editarlo.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
