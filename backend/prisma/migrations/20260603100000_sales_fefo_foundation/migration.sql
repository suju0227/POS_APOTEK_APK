CREATE TABLE "sales" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cashier_id" UUID NOT NULL,
  "sale_number" VARCHAR(100) NOT NULL,
  "payment_method" VARCHAR(50) NOT NULL,
  "subtotal" DECIMAL(18, 2) NOT NULL,
  "discount_total" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "grand_total" DECIMAL(18, 2) NOT NULL,
  "paid_amount" DECIMAL(18, 2) NOT NULL,
  "change_amount" DECIMAL(18, 2) NOT NULL,
  "total_hpp" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "total_profit" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_subtotal_check" CHECK ("subtotal" >= 0),
  CONSTRAINT "sales_discount_total_check" CHECK ("discount_total" >= 0),
  CONSTRAINT "sales_grand_total_check" CHECK ("grand_total" >= 0),
  CONSTRAINT "sales_paid_amount_check" CHECK ("paid_amount" >= 0),
  CONSTRAINT "sales_change_amount_check" CHECK ("change_amount" >= 0),
  CONSTRAINT "sales_total_hpp_check" CHECK ("total_hpp" >= 0)
);

CREATE TABLE "sale_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sale_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_unit_id" UUID NOT NULL,
  "product_name" VARCHAR(200) NOT NULL,
  "unit_name" VARCHAR(100) NOT NULL,
  "qty_sale" DECIMAL(18, 4) NOT NULL,
  "conversion_snapshot" DECIMAL(18, 4) NOT NULL,
  "qty_base" DECIMAL(18, 4) NOT NULL,
  "selling_price" DECIMAL(18, 2) NOT NULL,
  "subtotal" DECIMAL(18, 2) NOT NULL,
  "discount_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "total_after_discount" DECIMAL(18, 2) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sale_items_qty_sale_check" CHECK ("qty_sale" > 0),
  CONSTRAINT "sale_items_conversion_snapshot_check" CHECK ("conversion_snapshot" > 0),
  CONSTRAINT "sale_items_qty_base_check" CHECK ("qty_base" > 0),
  CONSTRAINT "sale_items_selling_price_check" CHECK ("selling_price" >= 0),
  CONSTRAINT "sale_items_subtotal_check" CHECK ("subtotal" >= 0),
  CONSTRAINT "sale_items_discount_amount_check" CHECK ("discount_amount" >= 0),
  CONSTRAINT "sale_items_total_after_discount_check" CHECK ("total_after_discount" >= 0)
);

CREATE TABLE "sale_batch_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sale_item_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "batch_number" VARCHAR(100) NOT NULL,
  "expired_date" DATE NOT NULL,
  "qty_base" DECIMAL(18, 4) NOT NULL,
  "hpp_base_snapshot" DECIMAL(18, 4) NOT NULL,
  "subtotal" DECIMAL(18, 2) NOT NULL,
  "discount_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "profit_amount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "returned_qty_base" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_batch_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sale_batch_allocations_qty_base_check" CHECK ("qty_base" > 0),
  CONSTRAINT "sale_batch_allocations_hpp_base_snapshot_check" CHECK ("hpp_base_snapshot" >= 0),
  CONSTRAINT "sale_batch_allocations_subtotal_check" CHECK ("subtotal" >= 0),
  CONSTRAINT "sale_batch_allocations_discount_amount_check" CHECK ("discount_amount" >= 0),
  CONSTRAINT "sale_batch_allocations_returned_qty_base_check" CHECK ("returned_qty_base" >= 0)
);

CREATE TABLE "idempotency_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(150) NOT NULL,
  "user_id" UUID NOT NULL,
  "action_type" VARCHAR(80) NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response_snapshot" JSONB,
  "status" VARCHAR(30) NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");
CREATE INDEX "idx_sales_cashier_id" ON "sales"("cashier_id");
CREATE INDEX "idx_sales_created_at" ON "sales"("created_at");
CREATE INDEX "idx_sale_items_sale_id" ON "sale_items"("sale_id");
CREATE INDEX "idx_sale_items_product_id" ON "sale_items"("product_id");
CREATE INDEX "idx_sale_items_product_unit_id" ON "sale_items"("product_unit_id");
CREATE INDEX "idx_sale_batch_allocations_sale_item_id" ON "sale_batch_allocations"("sale_item_id");
CREATE INDEX "idx_sale_batch_allocations_batch_id" ON "sale_batch_allocations"("batch_id");
CREATE INDEX "idx_idempotency_keys_user_id" ON "idempotency_keys"("user_id");
CREATE INDEX "idx_idempotency_keys_lookup" ON "idempotency_keys"("key", "user_id", "action_type");
CREATE INDEX "idx_idempotency_keys_action_type" ON "idempotency_keys"("action_type");
CREATE INDEX "idx_idempotency_keys_expires_at" ON "idempotency_keys"("expires_at");

ALTER TABLE "sales"
ADD CONSTRAINT "sales_cashier_id_fkey"
FOREIGN KEY ("cashier_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_sale_id_fkey"
FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_product_unit_id_fkey"
FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_batch_allocations"
ADD CONSTRAINT "sale_batch_allocations_sale_item_id_fkey"
FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_batch_allocations"
ADD CONSTRAINT "sale_batch_allocations_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "idempotency_keys"
ADD CONSTRAINT "idempotency_keys_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
