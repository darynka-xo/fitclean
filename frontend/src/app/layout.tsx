import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FitClean - Управление прачечной",
  description: "Современная система управления прачечной для фитнес-клубов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white min-h-screen`}>
        <Navbar />
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </body>
    </html>
  );
}
