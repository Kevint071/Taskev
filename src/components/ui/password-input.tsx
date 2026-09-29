"use client";

import { type ComponentProps, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

/** Password field with a show/hide toggle. */
export function PasswordInput({
  revealNoun = "contraseña",
  ...props
}: ComponentProps<typeof Input> & { revealNoun?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative flex">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className="h-11 w-full pr-11"
      />
      <button
        type="button"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${revealNoun}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}
