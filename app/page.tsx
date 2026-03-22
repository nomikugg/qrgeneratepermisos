import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-12 sm:px-8 md:px-12">
      <div className="blob-bg -left-20 top-8 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-16 top-28 h-72 w-72 bg-teal-300/60 [animation-delay:1.2s]" />
      <div className="blob-bg bottom-8 left-1/3 h-56 w-56 bg-sky-300/60 [animation-delay:2s]" />

      <section className="fade-rise relative mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.45)] backdrop-blur-lg sm:p-9 lg:p-12">
        <p className="inline-flex w-fit items-center rounded-full border border-teal-300/60 bg-teal-50 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-teal-800 uppercase">
          Plataforma de permisos vehiculares
        </p>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <h1 className="text-4xl leading-tight font-bold text-slate-900 sm:text-5xl lg:text-6xl">
              Sistema de Permisos QR
              <span className="mt-2 block text-teal-700">rapido, trazable y elegante</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Genera permisos individuales o lotes completos desde CSV con codigos QR seguros.
              Acelera operativos, reduce errores manuales y entrega archivos listos para imprimir en segundos.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/generar"
                className="rounded-2xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/30 transition hover:-translate-y-0.5 hover:bg-teal-600"
              >
                Empezar ahora
              </Link>
              <Link
                href="/generar/csv"
                className="rounded-2xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
              >
                Cargar CSV
              </Link>
              <Link
                href="/generar/pdf"
                className="rounded-2xl border border-indigo-300 bg-indigo-50 px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-indigo-100"
              >
                Editor PDF
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-2xl border-2 border-sky-200 bg-white/80 shadow-xl shadow-sky-700/15">
              <Image
                src="/images/landing-qr-hero.svg"
                alt="Ilustracion del sistema de permisos QR"
                width={1200}
                height={800}
                priority
                className="h-auto w-full"
              />
            </div>

            <article className="rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-100 via-cyan-100 to-sky-200 p-5 shadow-xl shadow-teal-700/20">
              <p className="text-sm font-semibold text-teal-900">Tiempo de respuesta</p>
              <p className="mt-1 text-3xl font-bold text-teal-800">&lt; 3s</p>
              <p className="mt-2 text-sm text-teal-950/80">Para generar y descargar un permiso individual.</p>
            </article>

            <article className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 p-5 shadow-xl shadow-indigo-700/20">
              <p className="text-sm font-semibold text-indigo-900">Proceso por lotes</p>
              <p className="mt-1 text-3xl font-bold text-indigo-800">CSV a ZIP</p>
              <p className="mt-2 text-sm text-indigo-950/80">Sube una hoja, descarga todos los QR organizados.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}