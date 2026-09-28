"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FormError } from "@/components/ui/field";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { getAvatarColor } from "@/lib/avatar";
import { MAX_NAME_LENGTH } from "@/lib/constraints";
import { passwordChecks } from "@/lib/password-checks";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme";

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-raised shadow-panel ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="px-5 pt-5">
      <h3 className="text-body font-semibold">{title}</h3>
      <p className="mt-0.5 text-muted">{description}</p>
    </div>
  );
}

/** Tinted bar closing a form card: status on the left, actions on the right. */
function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line bg-sunken/60 px-5 py-2.5">
      {children}
    </div>
  );
}

function Saved({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <output className="animate-caption-in mr-auto flex items-center gap-1.5 text-meta font-medium text-status-done">
      <span className="flex size-4 items-center justify-center rounded-full bg-status-done text-raised">
        <CheckIcon className="size-3" />
      </span>
      {message}
    </output>
  );
}

export function ProfileSection({
  email,
  name: initialName,
}: {
  email: string;
  name: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = name.trim();
  const tooLong = trimmed.length > MAX_NAME_LENGTH;
  const unchanged = trimmed === (initialName ?? "");
  // The card previews the name as it is typed, before it is saved.
  const identity = trimmed || email;
  const color = getAvatarColor(identity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el nombre");
      return;
    }
    setName(data.name ?? "");
    setSaved(data.name ? "Nombre guardado" : "Nombre eliminado");
    await update({ name: data.name });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div
          aria-hidden="true"
          className="h-20 transition-colors duration-300"
          style={{
            background: `linear-gradient(120deg, color-mix(in srgb, ${color} 34%, var(--raised)), color-mix(in srgb, ${color} 8%, var(--raised)))`,
          }}
        />
        <div className="flex items-end gap-4 px-5 pb-5">
          <Avatar
            identity={identity}
            className="-mt-9 size-18 text-2xl ring-4 ring-raised"
          />
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-section font-semibold">
              {trimmed || "Sin nombre"}
            </p>
            <p className="truncate text-muted">{email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader
            title="Nombre visible"
            description="Aparece en tu avatar y en la navegación. Si lo dejas vacío, se usa tu correo."
          />
          <div className="px-5 pt-4 pb-5">
            <Field
              label="Nombre"
              error={tooLong ? `Máximo ${MAX_NAME_LENGTH} caracteres` : error}
            >
              <Input
                value={name}
                autoComplete="name"
                placeholder="Cómo quieres que te llamemos"
                className="h-11 w-full"
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(null);
                }}
              />
            </Field>
          </div>
          <CardFooter>
            <Saved message={saved} />
            {!unchanged && !pending ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setName(initialName ?? "");
                  setError(null);
                }}
              >
                Descartar
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={pending || tooLong || unchanged}
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted">
            <MailIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-meta text-muted">Correo electrónico</p>
            <p className="truncate font-medium">{email}</p>
          </div>
          <span
            title="El correo no se puede cambiar"
            className="flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-meta text-muted"
          >
            <LockIcon className="size-3.5" />
            Fijo
          </span>
        </div>
      </Card>
    </div>
  );
}

/** Hand-drawn miniature of the app in a given palette. */
function ThemeMock({ dark }: { dark: boolean }) {
  const p = dark
    ? {
        surface: "#0a0c10",
        raised: "#14171d",
        line: "#23272f",
        ink: "#f2f4f8",
        accent: "#8fa4f5",
      }
    : {
        surface: "#f4f6f9",
        raised: "#ffffff",
        line: "#e0e5ec",
        ink: "#1a2332",
        accent: "#3553c7",
      };
  return (
    <span
      className="absolute inset-0 flex gap-1.5 p-2"
      style={{ background: p.surface }}
    >
      <span
        className="flex w-1/4 flex-col gap-1 rounded-[4px] p-1"
        style={{ background: p.raised }}
      >
        <span
          className="h-1 w-3/4 rounded-full"
          style={{ background: p.accent }}
        />
        <span
          className="h-1 w-full rounded-full"
          style={{ background: p.line }}
        />
        <span
          className="h-1 w-2/3 rounded-full"
          style={{ background: p.line }}
        />
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span
          className="h-1.5 w-1/2 rounded-full"
          style={{ background: p.ink }}
        />
        <span
          className="flex flex-1 flex-col gap-1 rounded-[4px] border p-1.5"
          style={{ background: p.raised, borderColor: p.line }}
        >
          <span
            className="h-1 w-full rounded-full"
            style={{ background: p.line }}
          />
          <span
            className="h-1 w-3/4 rounded-full"
            style={{ background: p.line }}
          />
          <span
            className="mt-auto h-1.5 w-1/3 rounded-full"
            style={{ background: p.accent }}
          />
        </span>
      </span>
    </span>
  );
}

function ThemePreview({ theme }: { theme: ThemePreference }) {
  if (theme !== "system") return <ThemeMock dark={theme === "dark"} />;
  return (
    <>
      <ThemeMock dark={false} />
      <span
        className="absolute inset-0"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      >
        <ThemeMock dark />
      </span>
    </>
  );
}

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader
        title="Tema"
        description="Elige cómo se ve Taskev en este dispositivo."
      />
      <fieldset className="grid grid-cols-3 gap-3 p-5 sm:gap-4">
        <legend className="sr-only">Tema</legend>
        {THEME_OPTIONS.map((option) => {
          const selected = option.value === theme;
          return (
            <label
              key={option.value}
              className="group flex cursor-pointer flex-col gap-2"
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={selected}
                onChange={() => setTheme(option.value)}
                className="peer sr-only"
              />
              <span
                className={`relative block aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                  selected
                    ? "border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    : "border-line group-hover:border-line-strong"
                }`}
              >
                <ThemePreview theme={option.value} />
                {selected ? (
                  <span className="animate-fab-in absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                    <CheckIcon className="size-3.5" />
                  </span>
                ) : null}
              </span>
              <span
                className={`text-center font-medium sm:text-left ${
                  selected ? "text-ink" : "text-muted"
                }`}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="border-t border-line bg-sunken/60 px-5 py-3 text-meta text-muted">
        «Sistema» cambia solo entre claro y oscuro según tu dispositivo.
      </p>
    </Card>
  );
}

function PasswordInput({
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

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const checks = passwordChecks({
    current: currentPassword,
    next: newPassword,
    confirm: confirmPassword,
  });
  const ready = currentPassword.length > 0 && checks.every((c) => c.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setSaved(null);
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
    setSaved("Contraseña actualizada");
  }

  function edit(setter: (value: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setSaved(null);
      setError(null);
    };
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader
          title="Cambiar contraseña"
          description="Primero confirma la actual; después elige una nueva."
        />
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
          <Field label="Contraseña actual">
            <PasswordInput
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={edit(setCurrentPassword)}
            />
          </Field>
          <div className="h-px bg-line" />
          <Field label="Nueva contraseña">
            <PasswordInput
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={edit(setNewPassword)}
            />
          </Field>
          <Field label="Repite la nueva contraseña">
            <PasswordInput
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={edit(setConfirmPassword)}
            />
          </Field>
          <ul
            aria-label="Requisitos de la nueva contraseña"
            className="flex flex-col gap-1.5 rounded-xl bg-sunken/70 p-3"
          >
            {checks.map((check) => (
              <li
                key={check.id}
                className={`flex items-center gap-2 text-meta transition-colors ${
                  check.ok ? "text-ink" : "text-muted"
                }`}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                    check.ok
                      ? "bg-status-done text-raised"
                      : "border border-line-strong"
                  }`}
                >
                  {check.ok ? <CheckIcon className="size-3" /> : null}
                </span>
                {check.label}
                <span className="sr-only">
                  {check.ok ? "(cumplido)" : "(pendiente)"}
                </span>
              </li>
            ))}
          </ul>
          <FormError message={error} />
        </div>
        <CardFooter>
          <Saved message={saved} />
          <Button type="submit" variant="primary" disabled={pending || !ready}>
            {pending ? "Actualizando…" : "Actualizar contraseña"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export type GeminiKeyStatus = { configured: boolean; last4?: string };

export function AssistantKeySection({
  initialStatus,
}: {
  initialStatus: GeminiKeyStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);
    const res = await fetch("/api/account/gemini-key", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar la API key");
      return;
    }
    const replaced = status.configured;
    setStatus({ configured: true, last4: data.last4 });
    setApiKey("");
    setSaved(replaced ? "API key reemplazada" : "API key guardada");
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    setSaved(null);
    const res = await fetch("/api/account/gemini-key", { method: "DELETE" });
    setDeleting(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError("No se pudo eliminar la API key");
      return;
    }
    setStatus({ configured: false });
    setSaved("API key eliminada");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader
            title="API key de Gemini"
            description={
              <>
                El asistente usa tu propia key, así que el uso y la cuota van a
                tu cuenta de Google. Puedes crear una gratis en{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  Google AI Studio
                </a>
                .
              </>
            }
          />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
            <div className="flex items-center gap-3 rounded-xl bg-sunken/70 p-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  status.configured
                    ? "bg-status-done text-raised"
                    : "border border-line-strong text-muted"
                }`}
              >
                {status.configured ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <LockIcon className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {status.configured ? "Configurada" : "Sin configurar"}
                </p>
                <p className="text-meta text-muted">
                  {status.configured
                    ? "El asistente está disponible."
                    : "Guarda una key para usar el asistente."}
                </p>
              </div>
              {status.configured && status.last4 ? (
                <span className="rounded-full bg-raised px-2.5 py-1 font-mono text-meta text-muted ring-1 ring-line">
                  ••••{status.last4}
                </span>
              ) : null}
            </div>
            <Field
              label={status.configured ? "Nueva API key" : "API key"}
              error={error}
            >
              <PasswordInput
                revealNoun="API key"
                autoComplete="off"
                spellCheck={false}
                placeholder="Pega aquí tu API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaved(null);
                  setError(null);
                }}
              />
            </Field>
          </div>
          <CardFooter>
            <Saved message={saved} />
            {status.configured ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
              >
                Eliminar
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={pending || apiKey.trim() === ""}
            >
              {pending
                ? "Verificando…"
                : status.configured
                  ? "Reemplazar"
                  : "Guardar"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <div className="flex gap-3 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted">
            <LockIcon />
          </span>
          <div className="min-w-0 text-meta text-muted">
            <p className="font-medium text-ink">Privacidad</p>
            <p className="mt-0.5">
              Cuando usas el asistente, los grupos, tareas y comentarios que
              consulta se envían a Google usando tu key. La key se guarda
              cifrada y nunca se vuelve a mostrar completa.
            </p>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar tu API key?"
        description="El asistente dejará de estar disponible hasta que guardes otra key."
        confirmLabel="Eliminar key"
        pending={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export function AccountSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPending(false);
      setOpen(false);
      setError(data.error ?? "No se pudo eliminar la cuenta");
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-4 p-5 sm:grid-cols-[auto_1fr_auto]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sunken text-muted">
            <LogOutIcon />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Cerrar sesión</p>
            <p className="text-meta text-muted">
              Sal de Taskev en este dispositivo.
            </p>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="col-span-2 sm:col-span-1"
          >
            Cerrar sesión
          </Button>
        </div>
      </Card>

      <Card className="border-danger/30">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-4 p-5 sm:grid-cols-[auto_1fr_auto]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <TrashIcon />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-danger">Eliminar cuenta</p>
            <p className="text-meta text-muted">
              Borra tu cuenta y todos tus grupos, tareas y comentarios. No se
              puede deshacer.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => setOpen(true)}
            className="col-span-2 sm:col-span-1"
          >
            Eliminar cuenta
          </Button>
        </div>
        {error ? (
          <div className="border-t border-danger/20 bg-danger/5 px-5 py-3">
            <FormError message={error} />
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={open}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tu cuenta y todos tus grupos, tareas y comentarios. No se puede deshacer."
        confirmLabel="Eliminar cuenta"
        confirmText={email}
        confirmTextLabel={
          <>
            Escribe <strong className="text-ink">{email}</strong> para confirmar
          </>
        }
        pending={pending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
