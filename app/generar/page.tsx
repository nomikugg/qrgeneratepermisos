import Link from "next/link";

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-12 sm:px-8 md:px-12">
      <div className="blob-bg -left-20 top-10 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-16 top-28 h-72 w-72 bg-teal-300/60 [animation-delay:1.2s]" />
      <div className="blob-bg bottom-10 left-1/3 h-56 w-56 bg-sky-300/60 [animation-delay:2s]" />

      <section className="fade-rise relative mx-auto w-full max-w-5xl rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.45)] backdrop-blur-lg sm:p-9">
        <p className="inline-flex w-fit items-center rounded-full border border-teal-300/60 bg-teal-50 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-teal-800 uppercase">
          Centro de generacion
        </p>

        <h1 className="mt-4 text-3xl leading-tight font-bold text-slate-900 sm:text-4xl lg:text-5xl">
          Elige tu flujo de trabajo
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Usa el modo individual para permisos puntuales o el modo CSV para operativos masivos.
          Ambos generan archivos listos para descargar y distribuir.
        </p>

        <div className="mt-6">
          <Link
            href="/generar/pdf"
            className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-100"
          >
            Ir al editor PDF
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Link
            href="/generar/individual"
            className="group rounded-2xl border-2 border-cyan-300 bg-linear-to-br from-cyan-100 via-sky-100 to-blue-200 p-5 shadow-xl shadow-cyan-700/20 transition hover:-translate-y-1 hover:border-cyan-500"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-cyan-900 uppercase">Uno por uno</p>
            <h2 className="mt-2 text-xl font-bold text-cyan-950">Generar individual</h2>
            <p className="mt-2 text-sm text-slate-600">
              Completa un formulario breve y descarga el QR en PNG al instante.
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-cyan-900 transition group-hover:translate-x-1">
              Abrir formulario
            </span>
          </Link>

          <Link
            href="/generar/csv"
            className="group rounded-2xl border-2 border-fuchsia-300 bg-linear-to-br from-fuchsia-100 via-violet-100 to-indigo-100 p-5 shadow-xl shadow-fuchsia-700/20 transition hover:-translate-y-1 hover:border-fuchsia-500"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-fuchsia-900 uppercase">Lote completo</p>
            <h2 className="mt-2 text-xl font-bold text-fuchsia-950">Generar por CSV</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sube tu archivo y recibe un ZIP con todos los codigos QR listos.
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-fuchsia-900 transition group-hover:translate-x-1">
              Cargar archivo
            </span>
          </Link>

          <Link
            href="/generar/pdf"
            className="group rounded-2xl border-2 border-emerald-300 bg-linear-to-br from-emerald-100 via-lime-100 to-teal-100 p-5 shadow-xl shadow-emerald-700/20 transition hover:-translate-y-1 hover:border-emerald-500"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-900 uppercase">Template PDF</p>
            <h2 className="mt-2 text-xl font-bold text-emerald-950">Generar desde PDF + CSV</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sube plantilla, ajusta posicion del QR y genera todos los PDFs de una vez.
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-emerald-900 transition group-hover:translate-x-1">
              Abrir editor PDF
            </span>
          </Link>

          <Link
            href="/generar/qr"
            className="group rounded-2xl border-2 border-sky-300 bg-linear-to-br from-sky-100 via-cyan-100 to-teal-100 p-5 shadow-xl shadow-sky-700/20 transition hover:-translate-y-1 hover:border-sky-500"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-sky-900 uppercase">Diseño libre</p>
            <h2 className="mt-2 text-xl font-bold text-sky-950">Generador QR personalizado</h2>
            <p className="mt-2 text-sm text-slate-600">
              Crea QR por enlace, cambia colores, formas y agrega logo al centro.
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-sky-900 transition group-hover:translate-x-1">
              Abrir diseñador
            </span>
          </Link>
        </div>

        <div className="mt-7">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}