import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Grupo | Taskev" };

export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}
