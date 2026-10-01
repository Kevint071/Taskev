import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Inicia sesión en Taskev para ver tus tareas ordenadas por lo que más importa hoy.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
