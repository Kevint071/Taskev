import { MIN_PASSWORD_LENGTH } from "./constraints";

export type PasswordRuleId = "length" | "letter" | "number" | "special";

export type PasswordCheck = {
  id: PasswordRuleId | "different" | "match";
  label: string;
  ok: boolean;
};

/** `short` is the compact wording used on chips. */
export type PasswordRule = PasswordCheck & {
  id: PasswordRuleId;
  short: string;
};

/** Requirements a password must meet; shared by the forms and the API routes. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `Al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      short: `${MIN_PASSWORD_LENGTH}+ caracteres`,
      ok: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "letter",
      label: "Una letra",
      short: "Letra",
      ok: /\p{L}/u.test(password),
    },
    {
      id: "number",
      label: "Un número",
      short: "Número",
      ok: /\p{N}/u.test(password),
    },
    {
      id: "special",
      label: "Un carácter especial (!, @, #, …)",
      short: "Carácter especial",
      ok: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ];
}

export function isStrongPassword(password: string): boolean {
  return passwordRules(password).every((rule) => rule.ok);
}

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
    ...passwordRules(next),
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

export const PASSWORD_REQUIREMENTS_ERROR = `debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres, una letra, un número y un carácter especial`;
