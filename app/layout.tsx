import type { Metadata } from "next";
import "./globals.css";
import { LeadGate } from "@/components/LeadGate";

export const metadata: Metadata = {
  title: "Creator ROI Scorer",
  description: "Data-driven creator scoring for affiliate marketing campaigns",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <LeadGate>{children}</LeadGate>
      </body>
    </html>
  );
}
