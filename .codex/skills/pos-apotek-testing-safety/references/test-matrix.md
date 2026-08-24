# POS Apotek Test Matrix

## Minimal Implementation Checks

- Frontend route/UI changes: `npm.cmd --prefix frontend run build`.
- Any code/docs change before commit: `git diff --check`.
- Do not run backend regression or Docker build by default.

## Backend Regression Session

Run focused suites for:

- auth and role guards;
- master data and product units;
- batches, purchases, purchase orders;
- FEFO, split batch, sales idempotency;
- sales returns and purchase returns;
- reports, exports, dashboard;
- cashier response sanitization.

## Manual E2E Session

- Manager creates product, units, batch/purchase, and checks stock.
- Apoteker creates prescription and marks ready.
- Kasir checks out product and prescription.
- Manager verifies sales history, stock mutation, return flow, profit report, and export.
- Kasir direct access to Manager API/pages is rejected.

## Docker Full Local Session

- `docker compose -f docker-compose.local.yml config`.
- `docker compose -f docker-compose.local.yml up -d`.
- `Invoke-RestMethod http://localhost/api/health`.
- Confirm only frontend exposes port `80` to host/LAN.
- Confirm backend and PostgreSQL remain internal.

## Backup/Restore Session

- Run `scripts\backup-db.bat` and verify `.sql` output.
- Restore only to a clean test database or test volume.
- Do not use `docker compose down -v` on the active data volume unless the user explicitly approves destructive reset.
