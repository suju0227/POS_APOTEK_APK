---
name: pos-apotek-v1-implementation
description: Use when implementing or reviewing POS Apotek V1 features in this repository, especially React/Vite frontend pages, NestJS/Prisma backend modules, stock, batch, FEFO, sales, purchases, returns, reports, users, settings, audit logs, or local deployment-sensitive code.
---

# POS Apotek V1 Implementation

## Workflow

1. Read `AGENTS.md` first, then load the required project docs only as needed for the task.
2. Inspect the existing feature/module shape before editing. Follow local patterns over introducing new abstractions.
3. Keep backend business rules in services/domain logic. Controllers should stay thin.
4. Keep frontend changes feature-based under `frontend/src/features/*` and use existing shared components.
5. Update `docs/08_TASK_COMPLETED_LOG_POS_APOTEK.md` when a task status materially changes.

## Non-Negotiable Guardrails

- Backend is the final source of truth for stock, batch, FEFO, HPP, profit, final price, returns, discounts, and stock mutations.
- Frontend may calculate temporary UI estimates only. Never store final transactions in localStorage.
- Stock must be batch-level in base unit. Do not add product-level-only stock.
- Sales must apply FEFO server-side and persist split batch allocations.
- Purchases, sales, returns, and stock adjustments must use database transactions and idempotency keys where applicable.
- Cashier responses and UI must not expose HPP, profit, margin, purchase price, purchase management, stock adjustment, or profit reports.
- Do not add BPJS, payment gateway, multi-branch, loyalty, full accounting, PWA offline, peer-to-peer sync, or client databases for V1.

## Useful References

- Read `references/business-rules.md` before changing stock, sales, purchases, returns, reports, or role/security behavior.
- Read `references/frontend-patterns.md` before adding or polishing React pages.
- Read `references/local-deployment.md` before touching Docker, environment variables, or API base URL behavior.

## Validation Policy

- In normal implementation sessions, run only focused checks such as `npm.cmd --prefix frontend run build` and `git diff --check` when relevant.
- Do not run backend regression, Docker builds, backup/restore, or E2E unless the user explicitly opens a testing/deployment session.
- If touching backend stock, sales, purchases, returns, reports, auth, or RBAC, document which focused backend tests should be run later in the testing session.
