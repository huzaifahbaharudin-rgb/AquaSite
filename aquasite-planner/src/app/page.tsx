import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = { title: "AquaSite · Choose your view" };

export default function Home() {
  return <Landing />;
}
