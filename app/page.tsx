import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-12 sm:px-8 md:px-12">
      <div className="blob-bg -left-20 top-8 h-52 w-52 bg-cyan-200/70" />
      <div className="blob-bg -right-16 top-28 h-72 w-72 bg-teal-300/60 [animation-delay:1.2s]" />
      <div className="blob-bg bottom-8 left-1/3 h-56 w-56 bg-sky-300/60 [animation-delay:2s]" />

      <section className="fade-rise relative mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.45)] backdrop-blur-lg sm:p-9 lg:p-12">
        {/* <div className="w-fit rounded-2xl border border-cyan-200 bg-white/85 px-4 py-3 shadow-lg shadow-cyan-700/10 backdrop-blur-sm">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-700 uppercase">SISTEMAS - TI</p>
          <p className="mt-1 text-sm font-medium text-slate-700">Automatización, control y auditoría digital</p>
        </div> */}

        <p className="inline-flex w-fit items-center rounded-full border border-teal-300/60 bg-teal-50 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-teal-800 uppercase">
          Sistema para generación de permisos vehiculares, QR personalizables
        </p>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl leading-tight font-bold text-slate-900 sm:text-5xl lg:text-6xl">
              Generador de QR.
              <span className="mt-2 block text-teal-700">rápido, elegante y personalizable</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Elige una accion principal para trabajar de inmediato: Generar permisos o crear un QR
              personalizable en alta calidad.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <Link
                href="/generar/pdf"
                className="group min-h-56 rounded-2xl border-2 border-teal-500 bg-linear-to-br from-teal-600 via-teal-700 to-cyan-700 p-5 text-white shadow-xl shadow-teal-900/30 transition hover:-translate-y-1"
              >
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-teal-100">Accion principal</p>
                <p className="mt-2 text-xl leading-tight font-bold lg:text-2xl">Generar permisos PDF</p>
                <p className="mt-2 text-sm text-teal-50/90">Carga tu plantilla y genera permisos listos para imprimir.</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-cyan-100 group-hover:text-white">
                  Ir al generador PDF
                </span>
              </Link>

              <Link
                href="/generar/qr"
                className="group min-h-56 rounded-2xl border border-sky-300 bg-white/90 p-5 text-sky-900 shadow-lg shadow-sky-900/10 transition hover:-translate-y-1 hover:border-sky-500"
              >
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-sky-700">Nueva herramienta</p>
                <p className="mt-2 text-xl leading-tight font-bold lg:text-2xl">QR personalizable</p>
                <p className="mt-2 text-sm text-slate-600">Define estilo, borde, logo y descarga en PNG o SVG.</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-sky-700 group-hover:text-sky-900">
                  Abrir diseño QR
                </span>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 self-start lg:pt-1">
            <div className="flex justify-start lg:justify-end">
              <Link
                href="/buscar"
                className="group inline-flex items-center gap-2 rounded-full border border-fuchsia-300 bg-white px-5 py-2.5 text-sm font-semibold text-fuchsia-800 shadow-lg shadow-fuchsia-900/10 transition hover:-translate-y-0.5 hover:border-fuchsia-500 hover:bg-fuchsia-50"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-100 text-[11px] font-bold text-fuchsia-700">QR</span>
                Buscar por placa
              </Link>
            </div>

            <div className="grid gap-4 rounded-2xl border-2 border-sky-200 bg-white/80 p-3 shadow-xl shadow-sky-700/15 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-sky-100 bg-white">
                <Image
                  src="/images/landing-qr-hero.svg"
                  alt="Ilustracion del sistema de permisos QR"
                  width={1200}
                  height={800}
                  priority
                  className="h-auto w-full"
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-cyan-100 bg-white">
                <Image
                  src="/images/imagen.jpg"
                  alt="Imagen adicional del sistema"
                  width={1200}
                  height={800}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <article className="rounded-2xl border-2 border-teal-300 bg-linear-to-br from-teal-100 via-cyan-100 to-sky-200 p-5 shadow-xl shadow-teal-700/20">
              <p className="text-sm font-semibold text-teal-900">Ruta sugerida</p>
              <p className="mt-1 text-3xl font-bold text-teal-800">PDF + QR</p>
              <p className="mt-2 text-sm text-teal-950/80">
                Genera permisos PDF y luego usa el diseño QR personalizable para campañas o material impreso.
              </p>
              <Link
                href="/generar"
                className="mt-4 inline-flex items-center rounded-xl border border-teal-500 bg-white/80 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:border-teal-700 hover:bg-white"
              >
                Más opciones
              </Link>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}