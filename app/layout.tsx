import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewsScript AI â€” Pembuat Naskah Berita Berbasis AI",
  description: "Aplikasi pembuatan naskah berita untuk tim redaksi. Analisis angle, rekomendasi AI, dan generate naskah multi-platform secara otomatis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

