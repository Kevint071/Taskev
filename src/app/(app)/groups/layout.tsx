import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Grupos | Taskev" };

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return children;
}
