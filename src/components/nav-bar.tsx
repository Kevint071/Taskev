"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function NavBar() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
      <nav className="flex gap-4 text-sm font-medium">
        <Link href="/projects" className="hover:underline">
          Proyectos
        </Link>
        <Link href="/tasks" className="hover:underline">
          Todas mis tareas
        </Link>
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-neutral-600 hover:underline"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
