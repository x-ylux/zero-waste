import { DemoProvider } from "@/components/providers/DemoProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueRelay — surplus food matching",
  description:
    "RescueRelay matches edible surplus from restaurants, caterers, and campus mess halls with NGO kitchens and volunteer couriers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
