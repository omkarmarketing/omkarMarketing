# Copilot Instructions for Omkar Marketing App

## Project Overview

Business management dashboard built with Next.js 13+ app router, TypeScript, and Tailwind CSS. Uses Clerk for authentication and Google Sheets API as the data store for companies, products, invoices, and transactions.

## Architecture

- **Frontend**: React components in `components/`, pages in `app/` with app router structure
- **API**: Server routes in `app/api/` for CRUD operations (e.g., `/api/company`, `/api/transactions`)
- **Data Layer**: Google Sheets integration via `lib/sheets.ts` and `lib/sheets-helper.ts` - treat Sheets as the database
- **Auth**: Clerk with middleware protecting routes; public routes: `/`, `/login`, `/sign-up`
- **UI**: shadcn/ui components in `components/ui/`, custom forms/tables in `components/`

## Key Patterns

- **Data Fetching**: Client-side fetches to API routes (see `app/dashboard/page.tsx` for stats loading)
- **Forms**: Use react-hook-form with shadcn/ui (e.g., `components/company-form.tsx`)
- **Tables**: Data tables with sorting/filtering (e.g., `components/company-table.tsx`)
- **Auth Checks**: Use `useUser()` from Clerk for conditional rendering
- **Error Handling**: Toast notifications via `useToast()` hook
- **Invoice Generation**: PDF creation in `lib/invoice.tsx` using jsPDF

## Workflows

- **Development**: `pnpm run dev` starts dev server on localhost:3000
- **Build**: `pnpm build` for production build
- **Data Export**: Excel export via `/api/transactions/export-excel` using SheetJS
- **Debugging**: Standard Next.js dev tools; check Sheets API responses in network tab

## Conventions

- **Component Structure**: "use client" for interactive components, server components for data loading
- **File Naming**: Kebab-case for files (e.g., `company-form.tsx`), PascalCase for components
- **Imports**: Absolute imports with `@/` alias (e.g., `@/components/ui/card`)
- **Styling**: Tailwind classes; dark mode support via Clerk themes
- **API Responses**: JSON arrays for lists, objects for single items
- **Environment**: `.env` for Clerk keys and Google Sheets credentials

## Integration Points

- **Clerk Auth**: User management, sign-in flows
- **Google Sheets API**: All data persistence; use service account auth
- **Vercel Analytics**: Tracking in production

Reference: `lib/sheets.ts` for data operations, `middleware.ts` for auth routing, `app/dashboard/page.tsx` for data loading patterns.
