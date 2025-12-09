import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Sale Internal App - Dashboard Manajemen",
  description: "Aplikasi internal untuk mengelola penjualan, pelanggan, aplikasi, dan lisensi dengan fitur WhatsApp automation.",
  keywords: ["sale", "internal", "dashboard", "pelanggan", "aplikasi", "lisensi", "whatsapp"],
  authors: [{ name: "Sale Internal Team" }],
  creator: "Sale Internal Team",
  publisher: "Sale Internal App",
  robots: "noindex, nofollow", // Since it's internal
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
