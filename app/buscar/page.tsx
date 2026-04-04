"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";

type SearchRecord = {
  id?: number;
  placa: string;
  placaNormalized?: string;
  createdAt: number;
  jobId: string;
  data: Record<string, string>;
};

function getRecordKey(record: SearchRecord): string {
  return `${record.jobId}-${record.createdAt}-${record.id ?? "noid"}`;
}

function getRecordInstanceKey(record: SearchRecord, index: number): string {
  return `${getRecordKey(record)}-${index}`;
}

const DISPLAY_FIELD_ORDER = ["placa", "modelo", "marca", "anio", "color", "licencia", "conductor"];

function normalizeFieldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function sortFieldEntries(data: Record<string, string>): Array<[string, string]> {
  const rankMap = new Map<string, number>(
    DISPLAY_FIELD_ORDER.map((key, index) => [normalizeFieldName(key), index])
  );

  return Object.entries(data).sort(([fieldA], [fieldB]) => {
    const rankA = rankMap.get(normalizeFieldName(fieldA)) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankMap.get(normalizeFieldName(fieldB)) ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return fieldA.localeCompare(fieldB, "es");
  });
}

export default function BuscarPermisosPage() {
  const [placa, setPlaca] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<SearchRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Record<string, string>>>({});
  const [templatePdf, setTemplatePdf] = useState<File | null>(null);
  const [useServerTemplate, setUseServerTemplate] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [qrX, setQrX] = useState("670");
  const [qrY, setQrY] = useState("130");
  const [qrWidth, setQrWidth] = useState("112");
  const [qrHeight, setQrHeight] = useState("112");

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setHasSearched(true);

    if (!placa.trim()) {
      setMessage("Ingresa una placa para buscar.");
      setResults([]);
      return;
    }

    setIsSearching(true);
    setMessage("Buscando...");

    try {
      const response = await fetch(`/api/permits/search?placa=${encodeURIComponent(placa.trim())}${showHistory ? "&history=1" : ""}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        error?: string;
        total?: number;
        results?: SearchRecord[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo realizar la busqueda.");
      }

      const found = payload.results ?? [];
      const initialEditedRows: Record<string, Record<string, string>> = {};

      for (const [index, record] of found.entries()) {
        initialEditedRows[getRecordInstanceKey(record, index)] = { ...record.data };
      }

      setEditedRows(initialEditedRows);
      setResults(found);
      setMessage(found.length > 0 ? `${found.length} resultado(s) encontrado(s).` : "");
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : "Error buscando permisos.");
    } finally {
      setIsSearching(false);
    }
  };

  const onPlacementChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value.replace(/[^0-9]/g, ""));
  };

  const handleGenerateOnePdf = async (record: SearchRecord, key: string) => {
    if (!useServerTemplate && !templatePdf) {
      setMessage("Carga primero una plantilla PDF para regenerar un permiso.");
      return;
    }

    const editedRow = editedRows[key] ?? { ...record.data };

    setDownloadingKey(key);
    setMessage(`Generando PDF para placa ${editedRow.placa || record.placa}...`);

    try {
      const formData = new FormData();
      if (!useServerTemplate && templatePdf) {
        formData.append("templatePdf", templatePdf);
      }
      formData.append("row", JSON.stringify(editedRow));
      formData.append("recordId", record.id ? String(record.id) : "");
      formData.append("jobId", record.jobId);
      formData.append("createdAt", String(record.createdAt));
      formData.append("useServerTemplate", String(useServerTemplate));
      formData.append("qrX", qrX);
      formData.append("qrY", qrY);
      formData.append("qrWidth", qrWidth);
      formData.append("qrHeight", qrHeight);

      const response = await fetch("/api/generate-pdf-one", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo generar el PDF individual.");
      }

      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${editedRow.placa || record.placa || "permiso"}.pdf`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setPlaca("");
      setResults([]);
      setEditedRows({});
      setHasSearched(false);
      setMessage(`PDF generado y registro actualizado para ${editedRow.placa || record.placa}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error generando el PDF individual.");
    } finally {
      setDownloadingKey("");
    }
  };

  const onEditField = (key: string, fieldName: string, value: string) => {
    setEditedRows((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [fieldName]: value.toUpperCase(),
      },
    }));
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 lg:px-10">
      <div className="blob-bg -left-16 top-10 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-10 top-28 h-64 w-64 bg-teal-300/60 [animation-delay:1s]" />

      <section className="fade-rise relative mx-auto w-full max-w-5xl overflow-hidden rounded-4xl border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_-44px_rgba(8,145,178,0.45)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-24 left-8 h-48 w-48 rounded-full bg-cyan-200/55 blur-3xl" />
          <div className="absolute -right-24 top-20 h-56 w-56 rounded-full bg-teal-200/55 blur-3xl" />
        </div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="relative">
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50/90 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase">
              Busqueda de permisos
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Buscar por placa</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Consulta los permisos ya generados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              Local JSON
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
              Supabase
            </span> */}
            <Link
              href="/generar"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            >
              Volver
            </Link>
          </div>
        </div>

        {/* <div className="mb-5 rounded-2xl border border-cyan-100 bg-linear-to-r from-cyan-50 via-white to-teal-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-cyan-900">Modo de trabajo</p>
          <p className="mt-1 text-sm text-slate-600">
            La app intenta guardar y consultar en Supabase. Si no está configurado o falla, usa el JSON local como respaldo.
          </p>
        </div> */}

        <div className="relative rounded-3xl border border-cyan-100/80 bg-linear-to-br from-white via-cyan-50/60 to-teal-50/70 p-4 shadow-[0_20px_50px_-35px_rgba(6,182,212,0.45)] sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <form onSubmit={handleSearch} className="contents">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.15em] text-cyan-700 uppercase">Placa vehicular</label>
                <input
                  type="text"
                  value={placa}
                  maxLength={10}
                  onChange={(e) => setPlaca(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10))}
                  placeholder="Ejemplo: 4565ATY"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="self-end rounded-2xl bg-linear-to-r from-cyan-700 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/25 transition hover:-translate-y-0.5 hover:from-cyan-600 hover:to-teal-500 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-cyan-800">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
              />
              Mostrar historial
            </label>
            <p className="text-[11px] font-medium text-slate-500">
              Busca por placa exacta para encontrar el registro mas reciente o revisar versiones.
            </p>
          </div>
        </div>

        {hasSearched && results.length > 0 && (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-sm font-semibold text-indigo-900">Regenerar PDF desde resultado</p>
            <p className="mt-1 text-xs text-indigo-800/80">
              Activa plantilla guardada para no subir PDF cada vez, o sube una temporal si prefieres.
            </p>

            <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800">
              <input
                type="checkbox"
                checked={useServerTemplate}
                onChange={(e) => setUseServerTemplate(e.target.checked)}
              />
              Usar plantilla guardada del servidor
            </label>

            {!useServerTemplate && (
              <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-indigo-700 uppercase">Plantilla PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setTemplatePdf(e.target.files?.[0] ?? null)}
                    className="w-full cursor-pointer rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Plantilla fija: <code>templates/permiso-base.pdf</code> (o variable <code>PDF_TEMPLATE_PATH</code>).
                  </p>
                </label>

                <div className="grid grid-cols-4 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-slate-600 uppercase">X</span>
                    <input value={qrX} onChange={onPlacementChange(setQrX)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-slate-600 uppercase">Y</span>
                    <input value={qrY} onChange={onPlacementChange(setQrY)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-slate-600 uppercase">W</span>
                    <input value={qrWidth} onChange={onPlacementChange(setQrWidth)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-slate-600 uppercase">H</span>
                    <input value={qrHeight} onChange={onPlacementChange(setQrHeight)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800" />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600">
            {message}
          </p>
        )}

        {hasSearched && !isSearching && results.length === 0 && (
          <div className="mt-5 rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-6 shadow-[0_20px_50px_-35px_rgba(217,119,6,0.45)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">Sin resultados</p>
            <h2 className="mt-2 text-2xl font-bold text-amber-900">No se encontró esa placa</h2>
            <p className="mt-2 max-w-2xl text-sm text-amber-900/80">
              Verifica que la placa esté bien escrita o intenta con menos caracteres. También puedes generar nuevos permisos desde el módulo principal.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/generar"
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-500 hover:bg-amber-100"
              >
                Ir a generar
              </Link>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {results.map((record, index) => {
            const key = getRecordInstanceKey(record, index);
            const edited = editedRows[key] || record.data;
            const entryList = sortFieldEntries(edited);
            const historicEntryList = entryList.filter(([fieldName]) => {
              const normalizedField = normalizeFieldName(fieldName);
              return normalizedField !== "placa";
            });
            const hasNewerSamePlate =
              results.slice(0, index).some((item) => item.placaNormalized === record.placaNormalized);
            const isHistoric = Boolean(hasNewerSamePlate);
            const canEditRecord = !isHistoric;

            return (
              <article
                key={key}
                className={`overflow-hidden rounded-3xl border bg-white ${
                  isHistoric
                    ? "border-slate-200/80 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]"
                    : "border-slate-200 shadow-[0_18px_45px_-28px_rgba(15,118,110,0.35)]"
                }`}
              >
                <div
                  className={`bg-linear-to-r text-white ${
                    isHistoric
                      ? "from-slate-600 via-slate-600 to-slate-500 px-4 py-3"
                      : "from-cyan-600 via-teal-600 to-emerald-500 px-4.5 py-3.5"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100 uppercase">
                        {isHistoric ? "Histórico" : "Vigente"}
                      </p>
                      <p className={`mt-1 font-bold tracking-wide ${isHistoric ? "text-lg" : "text-xl"}`}>
                        {edited.placa || record.placa}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      {new Date(record.createdAt).toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {isHistoric ? (
                  <div className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {historicEntryList.map(([fieldName, fieldValue]) => (
                      <div key={fieldName} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{fieldName}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{String(fieldValue || "-")}</p>
                      </div>
                    ))}
                    {historicEntryList.length === 0 && (
                      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                        Sin campos adicionales para mostrar
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {entryList.map(([fieldName, fieldValue]) => (
                        <label key={fieldName} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">{fieldName}</p>
                          <input
                            value={String(fieldValue || "")}
                            onChange={(event) => onEditField(key, fieldName, event.target.value)}
                            disabled={!canEditRecord}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleGenerateOnePdf(record, key)}
                        disabled={(!useServerTemplate && !templatePdf) || downloadingKey === key}
                        className="inline-flex rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-800 transition hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {downloadingKey === key ? "Generando..." : "Guardar cambios y generar PDF"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
