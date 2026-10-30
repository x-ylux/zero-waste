import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "RescuePlate - Capacity-Aware Food Redistribution",
  description:
    "Connecting food donors, NGOs, and volunteers with capacity-aware matching, split allocations, and durable pickup recovery.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#faf8f5] text-warmgray-900 antialiased">
        <DemoBanner />
        <Navbar currentUser={session} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
