# MediLife

Application française de gestion des gardes, des actes diagnostiques et de la rémunération d’un centre de diagnostic.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Supabase is accessed server-side through the installed Replit connector; no Supabase service credential is exposed to the browser.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: connected Supabase project, using the provided SQL schema and REST proxy
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/medilife/src/pages/` — Personnel, Planning, Actes and Rémunération screens
- `artifacts/api-server/src/routes/` — server-side Supabase proxy routes
- `lib/api-spec/openapi.yaml` — API source of truth and codegen input
- `attached_assets/medilife_schema_1788785548602.sql` — Supabase schema source of truth
- `artifacts/medilife/src/index.css` — MediLife visual system

## Architecture decisions

- The browser calls the MediLife API; Supabase access stays on the API server.
- The application does not create or replace the supplied Supabase schema.
- Staff specialities remain an array and scheduling constraints remain JSON so the SQL model is not flattened.
- Authentication is intentionally not blocking the development MVP and must be hardened before production.

## Product

- Maintain the medical staff directory against Supabase.
- Create, edit, lock and regenerate schedule slots.
- Record acts against the Supabase catalogue and act log.
- Read monthly remuneration summaries and print the report as PDF.

## User preferences

- Work incrementally from the supplied schema and do not introduce a local/mock database.

## Gotchas

- The user must execute the supplied SQL manually in Supabase before CRUD can be tested.
- The supplied act tariffs are intentionally zero until real values are entered in Supabase.
- The SQL currently contains read-only authenticated RLS policies; write/auth hardening remains before production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
