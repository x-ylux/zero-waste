import { DemoProvider } from "@/components/providers/DemoProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueRelay — surplus food matching",
  description:
    "RescueRelay connects surplus-food donors with community kitchens, animal shelters, and volunteer couriers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
