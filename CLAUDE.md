@AGENTS.md

## Comandos y entorno

- `pnpm test` ejecuta las pruebas de `src/lib/**/*.test.ts` con el runner de Node vía `tsx`. Para una sola prueba: `pnpm exec tsx --test src/lib/format.test.ts`.
- `pnpm lint` ejecuta Biome; no se usa ESLint ni Prettier.
- Para cambios de esquema, edita `src/lib/db/schema.ts`, ejecuta `pnpm db:generate` y después `pnpm db:migrate`. No uses `drizzle-kit push`; las migraciones de `drizzle/` deben quedar registradas en Git.
- `.env.local` necesita `DATABASE_URL` (Neon) y `AUTH_SECRET`. Los scripts `tsx` ejecutados fuera de Next.js no cargan el entorno automáticamente: deben importar `src/lib/env.ts` y usar `requireEnv`.

## Red corporativa

- Los comandos `dev`, `start` y `db:*` configuran `NODE_EXTRA_CA_CERTS` con `.certs/zscaler-root-ca.pem`.
- Detrás de Zscaler, las llamadas HTTPS a Neon fallan si falta ese certificado. `src/lib/db/index.ts` reintenta una vez el `fetch` ante fallos transitorios del proxy.

## Riesgos y convenciones

- `openspec/`, `.github/`, `.claude/` y `scripts/` están ignorados por Git. Las propuestas OpenSpec y scripts auxiliares (incluido `seed-demo-tasks.ts`) son locales; no asumas que están disponibles en otros entornos.
- No hay middleware de autenticación. La protección de páginas vive en `src/app/(app)/layout.tsx`; cada route handler de `src/app/api` debe validar propiedad con `requireOwnedProject`, `requireOwnedTask` o `requireUserId` de `src/lib/auth-guard.ts`. Una sesión JWT puede sobrevivir al borrado de una cuenta, por lo que el guard también comprueba que el usuario exista.
- Las actualizaciones optimistas de tareas se serializan por tarea en `src/lib/sync-queue.ts`. Los IDs temporales `tmp-*` deben resolverse con `idFor` antes de llamar a la API.
- Mantén en español los textos de UI y valores de dominio (por ejemplo, `disponible`, `en_curso`, `bloqueada`, `pausada`, `completada`); escribe el código y los comentarios en inglés.
