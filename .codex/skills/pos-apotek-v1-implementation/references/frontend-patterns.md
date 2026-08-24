# Frontend Patterns Reference

Use this reference before changing React/Vite UI.

## Structure

- Add feature code under `frontend/src/features/<feature>/`.
- Keep API calls in `<feature>.api.ts`, TanStack Query hooks in `<feature>.hooks.ts`, and types in `<feature>.types.ts`.
- Register routes in `frontend/src/app/App.tsx`.
- Register navigation in `frontend/src/app/layout/AppShell.tsx` only when the page should be visible in the sidebar.

## UI Behavior

- Use existing shared components before introducing new ones.
- Include loading, empty, and error states for data pages.
- Use Indonesian route/page labels for frontend user-facing screens.
- Keep Manager-only pages under Manager role protection even when backend also protects the endpoint.
- Avoid UI that implies frontend finalizes stock, HPP, profit, or transaction state.

## API Shape

- Use `apiClient` with paths relative to `VITE_API_BASE_URL`.
- Local production should use same-origin `/api`; do not hardcode cloud URLs or LAN IPs.
- API JSON uses camelCase.
