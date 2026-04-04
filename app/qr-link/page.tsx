type PageProps = {
  searchParams?: Promise<{
    t?: string;
  }>;
};

export default async function QrLinkPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const message = decodeURIComponent(params.t || "Mensaje QR");

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-12 sm:px-8 lg:px-12">
      <div className="blob-bg -left-16 top-12 h-56 w-56 bg-cyan-200/70" />
      <div className="blob-bg -right-14 top-20 h-64 w-64 bg-teal-300/60 [animation-delay:1.1s]" />

      <section className="fade-rise relative mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-white/65 bg-white/80 p-7 text-center shadow-[0_24px_90px_-40px_rgba(14,116,144,0.5)] backdrop-blur-xl sm:p-10">
        <p className="mx-auto inline-flex w-fit rounded-full border border-cyan-300 bg-cyan-50 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-800 uppercase">
          Link QR dinámico
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Contenido del QR</h1>

        <article className="rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-50 via-white to-teal-50 p-6 text-left shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase">Mensaje</p>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-lg leading-relaxed text-slate-800">{message}</p>
        </article>
      </section>
    </main>
  );
}
