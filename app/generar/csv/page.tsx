'use client';

import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/generate-batch", {
      method: "POST",
      body: formData,
    });

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrs.zip";
    a.click();
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8">
      <div className="blob-bg -left-20 top-24 h-52 w-52 bg-cyan-200/60" />
      <div className="blob-bg right-0 top-10 h-64 w-64 bg-emerald-200/55 [animation-delay:1.3s]" />

      <section className="fade-rise relative mx-auto w-full max-w-4xl rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_-36px_rgba(5,150,105,0.4)] backdrop-blur-lg sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase">Carga Masiva</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Generar QR desde CSV</h1>
            <p className="mt-2 text-sm text-slate-600">Sube un archivo con multiples registros y descarga un ZIP con todos los codigos QR.</p>
          </div>

          <Link
            href="/generar"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
          >
            Volver a opciones
          </Link>
        </div>

        <label className="block rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-6 transition hover:border-emerald-400 hover:bg-emerald-50">
          <span className="mb-3 block text-sm font-semibold text-emerald-800">Selecciona tu archivo CSV</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
          />
          <p className="mt-3 text-xs text-slate-500">Formato sugerido: columnas placa, modelo, marca, ano, color, licencia.</p>
        </label>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpload}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/30 transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!file}
          >
            Procesar CSV y descargar ZIP
          </button>
          <p className="text-xs text-slate-500">{file ? `Archivo: ${file.name}` : "Aun no has seleccionado archivo."}</p>
        </div>
      </section>
    </main>
  );
}