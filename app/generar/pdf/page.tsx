'use client';

import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { FormEvent, useEffect, useState } from "react";

type JobStatus = "pending" | "running" | "completed" | "failed";

type PlacementState = {
  qrX: string;
  qrY: string;
  qrWidth: string;
  qrHeight: string;
  flatten: boolean;
};

const initialPlacement: PlacementState = {
  qrX: "670",
  qrY: "130",
  qrWidth: "112",
  qrHeight: "112",
  flatten: true,
};

type PdfPageSize = {
  width: number;
  height: number;
};

function parsePlacementNumber(value: string | number | null | undefined, fallback: number): number {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value);

  if (normalized.trim() === "") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PdfGeneratorPage() {
  const [templatePdf, setTemplatePdf] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<PlacementState>(initialPlacement);
  const [pdfPageSize, setPdfPageSize] = useState<PdfPageSize | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [processedRows, setProcessedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (!templatePdf) {
      setPdfPreviewUrl("");
      setPdfPageSize(null);
      return;
    }

    const objectUrl = URL.createObjectURL(templatePdf);
    setPdfPreviewUrl(objectUrl);

    void (async () => {
      const templateBuffer = await templatePdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const firstPage = pdfDoc.getPages()[0];

      if (firstPage) {
        setPdfPageSize({
          width: firstPage.getWidth(),
          height: firstPage.getHeight(),
        });
      }
    })();

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [templatePdf]);

  const canGenerate = Boolean(templatePdf && csvFile && !isGenerating);
  const progressPercent = totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0;

  const onPlacementChange = (key: keyof PlacementState, value: number | boolean | string) => {
    setPlacement((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();

    if (!templatePdf || !csvFile) {
      setMessage("Carga el template PDF y el CSV antes de generar.");
      return;
    }

    setIsGenerating(true);
    setJobStatus("pending");
    setProcessedRows(0);
    setTotalRows(0);
    setMessage("Iniciando generacion por lote...");

    try {
      const formData = new FormData();
      formData.append("templatePdf", templatePdf);
      formData.append("csvFile", csvFile);
      formData.append("qrX", String(placement.qrX));
      formData.append("qrY", String(placement.qrY));
      formData.append("qrWidth", String(placement.qrWidth));
      formData.append("qrHeight", String(placement.qrHeight));
      formData.append("flatten", String(placement.flatten));

      setJobStatus("running");
      setMessage("Generando ZIP, espera unos segundos...");

      const generateResponse = await fetch("/api/generate-pdf-batch", {
        method: "POST",
        body: formData,
      });

      if (!generateResponse.ok) {
        let apiError = "No fue posible generar el lote PDF.";

        try {
          const payload = (await generateResponse.json()) as { error?: string };
          if (payload.error) {
            apiError = payload.error;
          }
        } catch {
          // no-op
        }

        throw new Error(apiError);
      }

      const zipBlob = await generateResponse.blob();
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "permisos-pdf.zip";
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setJobStatus("completed");
      setMessage("ZIP generado correctamente.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error generando PDFs.";
      setMessage(errorMsg);
      setJobStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(199,210,254,0.35),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(217,249,255,0.5),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-5 py-10 sm:px-8 lg:px-10">
      <div className="fade-rise relative mx-auto w-full max-w-7xl rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_28px_90px_-46px_rgba(30,41,59,0.45)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-indigo-700 uppercase">
              PDF + CSV + QR
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Generador PDF con plantilla</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Sube un template AcroForm, define la ubicacion del QR y genera un PDF por cada fila del CSV.
              Si los campos del formulario coinciden con tus columnas, se rellenan automaticamente.
            </p>
          </div>

          <Link
            href="/generar"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-500 hover:text-indigo-700"
          >
            Volver a generar
          </Link>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <label className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Template PDF (AcroForm)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setTemplatePdf(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
              />
            </label>

            <label className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Archivo CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-500"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-800">Ubicacion del QR</p>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="X" value={placement.qrX} onChange={(value) => onPlacementChange("qrX", value)} />
                <NumberField label="Y" value={placement.qrY} onChange={(value) => onPlacementChange("qrY", value)} />
                <NumberField label="Ancho" value={placement.qrWidth} onChange={(value) => onPlacementChange("qrWidth", value)} />
                <NumberField label="Alto" value={placement.qrHeight} onChange={(value) => onPlacementChange("qrHeight", value)} />
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={placement.flatten}
                  onChange={(e) => onPlacementChange("flatten", e.target.checked)}
                />
                Bloquear campos del PDF al final (flatten)
              </label>

              <p className="mt-2 text-xs text-slate-500">El QR se dibuja usando X, Y, Ancho y Alto.</p>
            </div>

            <button
              type="submit"
              disabled={!canGenerate}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isGenerating ? "Generando..." : "Generar ZIP de PDFs"}
            </button>

            {(isGenerating || jobStatus === "completed") && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Progreso</span>
                  <span>{totalRows > 0 ? `${processedRows}/${totalRows}` : `${processedRows}`}</span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-600">
                  {jobStatus === "completed"
                    ? "Completado: los PDF se generaron por placa y se descargaron en ZIP."
                    : "El ZIP se genera en una sola solicitud para mayor compatibilidad en Vercel."}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              {message || "Consejo: usa campos AcroForm llamados placa, modelo, marca, anio, color, licencia y conductor."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Preview del template</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">Solo visual</span>
            </div>
            {pdfPreviewUrl ? (
              <div
                className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
                style={{ aspectRatio: pdfPageSize ? `${pdfPageSize.width} / ${pdfPageSize.height}` : "612 / 792" }}
              >
                <iframe
                  src={pdfPreviewUrl}
                  title="Preview PDF"
                  className="h-full w-full"
                />
                <div
                  className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none"
                  style={{
                    left: `${((parsePlacementNumber(placement.qrX, 420)) / (pdfPageSize?.width ?? 612)) * 100}%`,
                    top: `${(((pdfPageSize?.height ?? 792) - parsePlacementNumber(placement.qrY, 470) - parsePlacementNumber(placement.qrHeight, 120)) / (pdfPageSize?.height ?? 792)) * 100}%`,
                    width: `${(parsePlacementNumber(placement.qrWidth, 120) / (pdfPageSize?.width ?? 612)) * 100}%`,
                    height: `${(parsePlacementNumber(placement.qrHeight, 120) / (pdfPageSize?.height ?? 792)) * 100}%`,
                  }}
                  title="Posicion del QR"
                >
                  <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    QR: {placement.qrWidth || "0"}x{placement.qrHeight || "0"}
                  </div>
                </div>
                {pdfPageSize && (
                  <div className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {Math.round(pdfPageSize.width)} × {Math.round(pdfPageSize.height)} pt
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500"
                style={{ aspectRatio: "612 / 792" }}
              >
                Carga un template PDF para mostrar la vista previa aqui.
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 uppercase">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}
