import { type ChangeEvent, type FormEvent, useState } from "react";
import type { ToastState } from "@/components/ui/toast";
import { passwordChecks, passwordRules } from "@/lib/password-checks";

/** The change-password form: three fields, live checks and the request. */
export function usePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, setPending] = useState(false);

  const checks = passwordChecks({
    current: currentPassword,
    next: newPassword,
    confirm: confirmPassword,
  });
  const ready = currentPassword.length > 0 && checks.every((c) => c.ok);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToast({
      id: Date.now(),
      message: "Contraseña actualizada",
      tone: "success",
    });
  }

  /** onChange handler that stores the value and clears the last error. */
  function edit(setter: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setError(null);
    };
  }

  return {
    values: {
      current: currentPassword,
      next: newPassword,
      confirm: confirmPassword,
    },
    onChange: {
      current: edit(setCurrentPassword),
      next: edit(setNewPassword),
      confirm: edit(setConfirmPassword),
    },
    rules: passwordRules(newPassword),
    matches: confirmPassword === newPassword,
    sameAsCurrent: newPassword.length > 0 && newPassword === currentPassword,
    ready,
    pending,
    error,
    toast,
    dismissToast: () => setToast(null),
    submit,
  };
}
