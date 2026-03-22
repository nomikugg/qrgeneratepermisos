import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema de Permisos QR",
    short_name: "Permisos QR",
    description: "Generacion de codigos QR para permisos vehiculares con soporte CSV y PDF.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7ff",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
