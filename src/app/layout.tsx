import type { Metadata } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { APP_NAME } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Discipleship classes, assessments and progress for our church family.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} ${anton.variable} min-h-full bg-cream`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
