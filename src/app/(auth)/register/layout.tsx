import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Crea tu cuenta en Taskev y deja que ordene tus tareas por grupo, prioridad y fecha límite.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
