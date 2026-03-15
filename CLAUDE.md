# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Muros is a real estate web platform for apartment development companies in Mexico. It has a public property search/lead capture interface and an admin dashboard with role-based access control. All UI text is in Spanish (es-MX).

## Commands

- `npm run dev` — Start dev server (Express + Vite middleware on port 5000)
- `npm run build` — Dual build: Vite (client → `dist/public/`) + esbuild (server → `dist/index.cjs`)
- `npm run start` — Production server (`node dist/index.cjs`)
- `npm run check` — TypeScript type-check (`tsc --noEmit`)
- `npm run db:push` — Push Drizzle schema to PostgreSQL (`drizzle-kit push`)

No test framework is configured.

## Architecture

**Monolith with three source directories:**
- `client/` — React 18 + Vite frontend
- `server/` — Express 5 backend
- `shared/` — Drizzle schema, Zod types, constants shared by both

**Path aliases** (in tsconfig and vite): `@/*` → `client/src/*`, `@shared/*` → `shared/*`

### Frontend

- **Routing**: Wouter (not React Router)
- **Data fetching**: TanStack React Query v5 (`staleTime: Infinity`, no background refetch)
- **UI**: Shadcn/UI "new-york" style on Radix primitives, Tailwind CSS v3
- **Theming**: CSS custom properties in `client/src/index.css`. Primary: blue `hsl(202 89% 41%)`, secondary: golden `hsl(43 76% 53%)`. Fonts: Montserrat (headings), Open Sans (body). Dark mode via `class` strategy (next-themes).
- **Auth context**: `client/src/lib/auth.tsx` — `AuthProvider` + `useAuth` hook. Session stored as `httpOnly` cookie (`muros_session`), sent automatically with `credentials: "include"` on all fetch calls.
- **API helper**: `client/src/lib/queryClient.ts` — `apiRequest()` wraps fetch with `credentials: "include"`.

### Backend

- **Auth**: Custom session-based (not express-session middleware). bcrypt hashing (10 rounds). Sessions stored in DB, expire in 7 days.
- **Middleware**: `requireAuth` reads `Authorization` header; `requireRole(...roles)` gates by user role.
- **Data access**: `IStorage` interface + `DatabaseStorage` class in `server/storage.ts`. All DB access goes through this layer, not direct Drizzle calls in routes.
- **WebSocket**: Native `ws` at path `/ws` for real-time typology spreadsheet sync (broadcasts create/update/delete events).
- **File uploads**: multer (local `uploads/` dir, 100MB limit) + Replit Object Storage (Google Cloud Storage) via presigned URLs in `server/replit_integrations/`.

### Database

PostgreSQL with Drizzle ORM. Schema defined in `shared/schema.ts`. Migrations output to `./migrations/`. Requires `DATABASE_URL` env var.

### Role-Based Permissions

6 roles: `admin`, `actualizador`, `perfilador`, `asesor`, `finanzas`, `desarrollador`. The `PAGE_PERMISSIONS` matrix in `shared/schema.ts` defines field-level permissions (`none`/`view`/`edit`) per role for each entity. The `useFieldPermissions` hook in `client/src/hooks/use-field-permissions.ts` enforces these on the frontend.

### Spreadsheet Components

The core admin UI uses custom Excel-like spreadsheet components (`typology-spreadsheet.tsx`, `developers-spreadsheet.tsx`, `developments-spreadsheet.tsx`, `prospects-spreadsheet.tsx`). These feature inline editing, 19 calculated formula fields, WebSocket sync, auto-save, column filtering, and 3-state publication status. See `TYPOLOGY_SPREADSHEET_TECHNICAL_DOC.md` for the full technical spec. Shared utilities live in `client/src/lib/spreadsheet-utils.ts` and `client/src/components/ui/spreadsheet-shared.tsx`.

### Catalog System

30+ catalog tables (cities, zones, amenities, property types, etc.) managed via `/admin/catalogos`. Static fallback lists in `shared/constants.ts`.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — Server port (default: 5000)
- `NODE_ENV` — `development` or `production`
