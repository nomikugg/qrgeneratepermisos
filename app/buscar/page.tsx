"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SearchRecord = {
  placa: string;
  createdAt: number;
  jobId: string;
  data: Record<string, string>;
};

export default function BuscarPermisosPage() {
  const [placa, setPlaca] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("Busca por placa para ver permisos generados desde CSV.");
  const [results, setResults] = useState<SearchRecord[]>([]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (!placa.trim()) {
      setMessage("Ingresa una placa para buscar.");
      setResults([]);
      return;
    }

    setIsSearching(true);
    setMessage("Buscando...");

    try {
      const response = await fetch(`/api/permits/search?placa=${encodeURIComponent(placa.trim())}`, {
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
      setResults(found);
      setMessage(found.length > 0 ? `${found.length} resultado(s) encontrado(s).` : "No se encontraron permisos para esa placa.");
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : "Error buscando permisos.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 lg:px-10">
      <div className="blob-bg -left-16 top-10 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-10 top-28 h-64 w-64 bg-teal-300/60 [animation-delay:1s]" />

      <section className="fade-rise relative mx-auto w-full max-w-5xl rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_-42px_rgba(8,145,178,0.35)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase">
              Busqueda de permisos
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Buscar por placa</h1>
            <p className="mt-2 text-sm text-slate-600">
              Consulta los permisos ya generados desde CSV. La busqueda usa los datos guardados en JSON.
            </p>
          </div>

          <Link
            href="/generar"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
          >
            Volver
          </Link>
        </div>

        <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Ejemplo: ABC123"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/25 transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSearching ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-600">{message}</p>

        <div className="mt-5 space-y-3">
          {results.map((record, index) => (
            <article key={`${record.jobId}-${record.createdAt}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-bold tracking-wide text-slate-900">{record.placa}</p>
                <p className="text-xs text-slate-500">{new Date(record.createdAt).toLocaleString("es-PE")}</p>
              </div>

              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold">Conductor:</span> {record.data.conductor || "-"}</p>
                <p><span className="font-semibold">Licencia:</span> {record.data.licencia || "-"}</p>
                <p><span className="font-semibold">Marca:</span> {record.data.marca || "-"}</p>
                <p><span className="font-semibold">Modelo:</span> {record.data.modelo || "-"}</p>
                <p><span className="font-semibold">Color:</span> {record.data.color || "-"}</p>
                <p><span className="font-semibold">Anio:</span> {record.data.anio || "-"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
