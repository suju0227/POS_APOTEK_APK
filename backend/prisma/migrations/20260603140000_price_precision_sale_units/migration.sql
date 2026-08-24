ALTER TABLE product_units
  ADD COLUMN is_sale_unit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN min_sale_qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  ADD COLUMN sale_unit_note TEXT;

ALTER TABLE product_units
  ADD CONSTRAINT product_units_min_sale_qty_positive CHECK (min_sale_qty > 0);

ALTER TABLE product_batches
  ALTER COLUMN hpp_base TYPE NUMERIC(18,8);

ALTER TABLE batch_unit_prices
  ALTER COLUMN selling_price TYPE NUMERIC(18,0);

ALTER TABLE purchases
  ALTER COLUMN subtotal TYPE NUMERIC(18,6);

ALTER TABLE purchase_items
  ALTER COLUMN purchase_price TYPE NUMERIC(18,6),
  ALTER COLUMN hpp_base TYPE NUMERIC(18,8),
  ALTER COLUMN total_price TYPE NUMERIC(18,6);

ALTER TABLE sales
  ALTER COLUMN subtotal TYPE NUMERIC(18,0),
  ALTER COLUMN discount_total TYPE NUMERIC(18,0),
  ALTER COLUMN grand_total TYPE NUMERIC(18,0),
  ALTER COLUMN paid_amount TYPE NUMERIC(18,0),
  ALTER COLUMN change_amount TYPE NUMERIC(18,0),
  ALTER COLUMN total_hpp TYPE NUMERIC(18,8),
  ALTER COLUMN total_profit TYPE NUMERIC(18,8);

ALTER TABLE sale_items
  ALTER COLUMN selling_price TYPE NUMERIC(18,0),
  ALTER COLUMN subtotal TYPE NUMERIC(18,0),
  ALTER COLUMN discount_amount TYPE NUMERIC(18,0),
  ALTER COLUMN total_after_discount TYPE NUMERIC(18,0);

ALTER TABLE sale_batch_allocations
  ALTER COLUMN hpp_base_snapshot TYPE NUMERIC(18,8),
  ALTER COLUMN subtotal TYPE NUMERIC(18,0),
  ALTER COLUMN discount_amount TYPE NUMERIC(18,0),
  ALTER COLUMN profit_amount TYPE NUMERIC(18,8);
