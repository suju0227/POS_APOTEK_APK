## 2024-11-04 - Missing ARIA labels on shared Button component
**Learning:** Shared UI components (like `Button`) used for icon-only actions often lack screen reader accessibility if `aria-label` is not explicitly provided. This is a common pattern in the app (e.g., `PrescriptionPage.tsx`, `PurchaseReturnPage.tsx`).
**Action:** When using the shared `Button` component in `frontend/src/shared/components/` for icon-only actions (e.g., passing only a lucide-react icon), explicitly provide an `aria-label` for screen reader accessibility in Indonesian.
