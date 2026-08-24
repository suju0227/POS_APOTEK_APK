---
name: pos-apotek-testing-safety
description: Use when planning or running POS Apotek validation, including frontend build checks, manual smoke tests, role/security checks, backend regression sessions, Docker Full Local Mode validation, and backup/restore testing.
---

# POS Apotek Testing Safety

## Session Policy

- Implementation sessions use minimal checks only: focused build/typecheck and `git diff --check`.
- Testing sessions may run backend regression, E2E/manual smoke, Docker checks, and backup/restore validation.
- Do not mix large regression or Docker validation into a feature implementation session unless the user explicitly asks.

## Test Matrix

Read `references/test-matrix.md` before a dedicated testing session.

## Manual Smoke Priority

1. Manager login, dashboard, master data, purchase, stock, reports, export, users, settings, audit log.
2. Apoteker login, create prescription, mark ready, create counseling record.
3. Kasir login, sell product, pull ready prescription, checkout via backend, confirm no HPP/profit exposure.
4. Manager verifies stock mutation, sales history, returns, and reports.

## Docker and Data Safety

- Docker checks are deployment-session tasks, not default implementation checks.
- Never run cleanup commands that delete database volumes unless explicitly requested.
- Backup/restore verification must restore into a clean test volume/database, never overwrite the active local database.
