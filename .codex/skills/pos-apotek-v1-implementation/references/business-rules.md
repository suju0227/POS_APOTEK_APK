# Business Rules Reference

Use this reference for stock, sales, purchase, return, report, user, settings, and audit-log work.

## Stock and Batch

- Store stock by batch in base unit.
- Do not allow negative batch stock.
- Do not use expired batches for normal sales.
- Purchase orders do not change stock. Final purchases add stock.
- Prescriptions do not change stock until cashier checkout succeeds.

## Sales and Profit

- Backend applies FEFO and creates split batch allocation records.
- Sale details must snapshot final selling price, HPP, discount allocation, and profit.
- Profit reports must use historical sale details, not current product prices.
- Selling price shown to customers is rupiah-rounded and manually managed by Manager.
- Internal modal/HPP/profit calculations use high precision decimal types, never float/double/real.

## Returns and Mutations

- Sales returns and purchase returns must reference the original transaction.
- Every stock-changing operation must create stock mutation history.
- Do not hard-delete historical transactions, batches, purchases, returns, or stock mutations.

## Roles

- Minimum roles: `KASIR`, `APOTEKER`, `MANAGER`.
- `KASIR` may sell products and pull ready prescriptions to checkout.
- `APOTEKER` may manage prescription and counseling workflows.
- `MANAGER` may access management, purchase, stock, reports, users, settings, and audit log areas.
- Frontend menu hiding is not security. Backend guards must reject direct access.
