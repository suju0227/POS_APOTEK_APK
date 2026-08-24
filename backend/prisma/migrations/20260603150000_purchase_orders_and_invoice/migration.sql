CREATE TABLE "purchase_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplier_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "po_number" VARCHAR(100) NOT NULL,
  "order_date" DATE NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "sent_at" TIMESTAMP(6),
  "cancelled_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_orders_status_check" CHECK ("status" IN ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'))
);

CREATE TABLE "purchase_order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchase_order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_unit_id" UUID NOT NULL,
  "qty_ordered" NUMERIC(18,4) NOT NULL,
  "qty_received" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "note" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_items_qty_ordered_positive_check" CHECK ("qty_ordered" > 0),
  CONSTRAINT "purchase_order_items_qty_received_nonnegative_check" CHECK ("qty_received" >= 0)
);

ALTER TABLE "purchases"
  ADD COLUMN "purchase_order_id" UUID,
  ADD COLUMN "invoice_date" DATE,
  ADD COLUMN "tax_mode" VARCHAR(50) NOT NULL DEFAULT 'NON_PPN',
  ADD COLUMN "tax_rate_percent" NUMERIC(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "purchase_discount_amount" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "invoice_total_input" NUMERIC(18,6),
  ADD COLUMN "calculated_total" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "rounding_adjustment" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "difference_note" TEXT,
  ADD CONSTRAINT "purchases_tax_mode_check" CHECK ("tax_mode" IN ('NON_PPN', 'PPN_INCLUDED', 'PPN_EXCLUDED')),
  ADD CONSTRAINT "purchases_tax_rate_nonnegative_check" CHECK ("tax_rate_percent" >= 0);

ALTER TABLE "purchase_items"
  ADD COLUMN "purchase_order_item_id" UUID,
  ADD COLUMN "qty_ordered" NUMERIC(18,4),
  ADD COLUMN "qty_received" NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_type" VARCHAR(30) NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "gross_total" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "net_total" NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "purchase_items_discount_type_check" CHECK ("discount_type" IN ('NONE', 'NOMINAL', 'PERCENT')),
  ADD CONSTRAINT "purchase_items_discount_value_nonnegative_check" CHECK ("discount_value" >= 0),
  ADD CONSTRAINT "purchase_items_discount_amount_nonnegative_check" CHECK ("discount_amount" >= 0),
  ADD CONSTRAINT "purchase_items_gross_total_nonnegative_check" CHECK ("gross_total" >= 0),
  ADD CONSTRAINT "purchase_items_net_total_nonnegative_check" CHECK ("net_total" >= 0);

UPDATE "purchases"
SET "calculated_total" = "subtotal"
WHERE "calculated_total" = 0;

UPDATE "purchase_items"
SET
  "qty_received" = "qty_purchase",
  "gross_total" = "total_price",
  "net_total" = "total_price"
WHERE "qty_received" = 0;

ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_qty_received_positive_check" CHECK ("qty_received" > 0);

CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "idx_purchase_orders_supplier_id" ON "purchase_orders"("supplier_id");
CREATE INDEX "idx_purchase_orders_created_by_id" ON "purchase_orders"("created_by_id");
CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders"("status");
CREATE INDEX "idx_purchase_orders_order_date" ON "purchase_orders"("order_date");

CREATE INDEX "idx_purchase_order_items_purchase_order_id" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "idx_purchase_order_items_product_id" ON "purchase_order_items"("product_id");
CREATE INDEX "idx_purchase_order_items_product_unit_id" ON "purchase_order_items"("product_unit_id");

CREATE INDEX "idx_purchases_purchase_order_id" ON "purchases"("purchase_order_id");
CREATE INDEX "idx_purchase_items_purchase_order_item_id" ON "purchase_items"("purchase_order_item_id");

ALTER TABLE "purchase_orders"
ADD CONSTRAINT "purchase_orders_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_orders"
ADD CONSTRAINT "purchase_orders_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey"
FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_product_unit_id_fkey"
FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchases"
ADD CONSTRAINT "purchases_purchase_order_id_fkey"
FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_purchase_order_item_id_fkey"
FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
