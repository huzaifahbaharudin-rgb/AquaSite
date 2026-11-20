import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Shell from "@/components/Shell";
import { ScenarioProvider } from "@/lib/state/store";

export const metadata: Metadata = {
  title: "AquaSite · Data centre water planning (Johor)",
  description: "Select a site and configure a data centre to estimate its water footprint.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ScenarioProvider>
          <Shell>{children}</Shell>
        </ScenarioProvider>
      </body>
    </html>
  );
}
