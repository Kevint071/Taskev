import { MIN_PASSWORD_LENGTH } from "./constraints";

export type PasswordCheck = {
  id: "length" | "different" | "match";
  label: string;
  ok: boolean;
};

/** Live requirements shown while the user picks a new password. */
export function passwordChecks({
  current,
  next,
  confirm,
}: {
  current: string;
  next: string;
  confirm: string;
}): PasswordCheck[] {
  return [
    {
      id: "length",
      label: `Al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      ok: next.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "different",
      label: "Distinta de la actual",
      ok: next.length > 0 && next !== current,
    },
    {
      id: "match",
      label: "Las dos coinciden",
      ok: confirm.length > 0 && confirm === next,
    },
  ];
}
