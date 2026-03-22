'use client';

import Link from "next/link";
import { ChangeEvent, useState } from "react";

const fields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: "placa", label: "Placa", placeholder: "3456FTH" },
  { key: "modelo", label: "Modelo", placeholder: "HILUX" },
  { key: "marca", label: "Marca", placeholder: "TOYOTA" },
  { key: "anio", label: "AñO", placeholder: "2026" },
  { key: "color", label: "Color", placeholder: "BLANCO" },
  { key: "licencia", label: "Licencia", placeholder: "L458932" },
  { key: "conductor", label: "Conductor", placeholder: "JUAN PEREZ RIOS" },
];

type FormState = {
  placa: string;
  modelo: string;
  marca: string;
  anio: string;
  color: string;
  licencia: string;
  conductor: string;
};

export default function Page() {
  const [form, setForm] = useState<FormState>({
    placa: "",
    modelo: "",
    marca: "",
    anio: "",
    color: "",
    licencia: "",
    conductor: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value.toUpperCase() });
  };

  const handleSubmit = async () => {
    if (!form.placa.trim()) {
      return;
    }

    const res = await fetch("/api/generate-one", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.placa}.png`;
    a.click();
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8">
      <div className="blob-bg -left-20 top-20 h-52 w-52 bg-sky-200/60" />
      <div className="blob-bg -right-12 top-12 h-60 w-60 bg-teal-200/60 [animation-delay:1s]" />

      <section className="fade-rise relative mx-auto w-full max-w-4xl rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_-36px_rgba(17,24,39,0.35)] backdrop-blur-lg sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-teal-700 uppercase">Formulario Individual</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Generar QR de permiso</h1>
            <p className="mt-2 text-sm text-slate-600">Completa los datos del vehiculo y descarga el QR en formato PNG.</p>
          </div>

          <Link
            href="/generar"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
          >
            Volver a opciones
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">{field.label}</span>
              <input
                name={field.key}
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 uppercase shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Referencia: HILUX es el modelo y TOYOTA es la marca.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSubmit}
            className="rounded-2xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/30 transition hover:-translate-y-0.5 hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!form.placa.trim()}
          >
            Generar y descargar PNG
          </button>
          <p className="text-xs text-slate-500">Requerido: al menos el campo placa.</p>
        </div>
      </section>
    </main>
  );
}