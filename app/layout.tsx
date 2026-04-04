import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import InitialLoader from "@/app/components/InitialLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Sistema de Permisos QR",
    template: "%s | Sistema de Permisos QR",
  },
  description: "Plataforma para generar codigos QR de permisos vehiculares, individual o masivo desde CSV y PDF.",
  applicationName: "Sistema de Permisos QR",
  keywords: [
    "permisos vehiculares",
    "codigos QR",
    "CSV a QR",
    "AcroForm",
    "PDF",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sistema de Permisos QR",
    description: "Generacion de QR para permisos vehiculares con soporte CSV y PDF AcroForm.",
    siteName: "Sistema de Permisos QR",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema de Permisos QR",
    description: "Genera y descarga permisos QR en segundos.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <InitialLoader />
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
              <div className="relative overflow-hidden rounded-full border border-cyan-200/80 bg-linear-to-r from-cyan-50 via-sky-50 to-white px-4 py-2 shadow-[0_10px_28px_-20px_rgba(8,145,178,0.7)]">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-cyan-200/35 to-transparent" />
                <div className="relative inline-flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow-[0_0_0_5px_rgba(8,145,178,0.2)]">
                    TI
                  </span>
                  <div className="leading-tight">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-800 uppercase">SISTEMAS - TI</p>
                    <p className="text-[11px] font-medium text-slate-600">Soporte y automatización de permisos vehiculares</p>
                  </div>
                </div>
              </div>

              <p className="hidden rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 sm:block">
                Plataforma interna para generación de permisos vehiculares con QR.
              </p>
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-10">
              <p className="text-xs text-slate-600">
                © {currentYear} Sistema de Permisos QR. Todos los derechos reservados. <span className="font-semibold text-slate-700">by @nomikugg</span>
              </p>

              <a
                href="https://github.com/nomikugg/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
              >
                GitHub: @nomikugg
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
