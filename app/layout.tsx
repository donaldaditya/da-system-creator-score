import type { Metadata } from "next";
import "./globals.css";
import { LeadGate } from "@/components/LeadGate";

export const metadata: Metadata = {
  title: "DA System: Creator Score",
  description: "Decision Architecture for Commerce Teams",
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
