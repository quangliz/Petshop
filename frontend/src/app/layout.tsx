import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { Toaster } from '@/components/ui/sonner';
import ConsentCenter from "@/components/consent/ConsentCenter";
import WebVitalsReporter from "@/components/analytics/WebVitalsReporter";

const beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ThePawsome",
  description: "Thú cưng của bạn, AI hiểu từng chi tiết",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          <WebVitalsReporter />
          {children}
          <ConsentCenter />
        </Providers>
        <Toaster richColors position="bottom-right" toastOptions={{ style: { borderRadius: '12px', fontWeight: 600, fontSize: '13px' } }} />
      </body>
    </html>
  );
}
