CREATE TABLE "sales_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sale_id" UUID NOT NULL,
  "cashier_id" UUID NOT NULL,
  "return_number" VARCHAR(100) NOT NULL,
  "reason" TEXT NOT NULL,
  "total_refund" NUMERIC(18,0) NOT NULL DEFAULT 0,
  "total_hpp_reversed" NUMERIC(18,8) NOT NULL DEFAULT 0,
  "total_profit_reversed" NUMERIC(18,8) NOT NULL DEFAULT 0,
  "status" VARCHAR(50) NOT NULL DEFAULT 'FINAL',
  "idempotency_key" VARCHAR(150),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sales_return_id" UUID NOT NULL,
  "sale_batch_allocation_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "qty_base_returned" NUMERIC(18,4) NOT NULL,
  "refund_amount" NUMERIC(18,0) NOT NULL,
  "hpp_reversed" NUMERIC(18,8) NOT NULL,
  "profit_reversed" NUMERIC(18,8) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_returns_return_number_key"
  ON "sales_returns"("return_number");

CREATE INDEX "idx_sales_returns_sale_id"
  ON "sales_returns"("sale_id");

CREATE INDEX "idx_sales_returns_cashier_id"
  ON "sales_returns"("cashier_id");

CREATE INDEX "idx_sales_returns_created_at"
  ON "sales_returns"("created_at");

CREATE INDEX "idx_sales_return_items_sales_return_id"
  ON "sales_return_items"("sales_return_id");

CREATE INDEX "idx_sales_return_items_allocation_id"
  ON "sales_return_items"("sale_batch_allocation_id");

CREATE INDEX "idx_sales_return_items_product_id"
  ON "sales_return_items"("product_id");

CREATE INDEX "idx_sales_return_items_batch_id"
  ON "sales_return_items"("batch_id");

ALTER TABLE "sales_returns"
  ADD CONSTRAINT "sales_returns_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_returns"
  ADD CONSTRAINT "sales_returns_cashier_id_fkey"
  FOREIGN KEY ("cashier_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_return_items"
  ADD CONSTRAINT "sales_return_items_sales_return_id_fkey"
  FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_return_items"
  ADD CONSTRAINT "sales_return_items_sale_batch_allocation_id_fkey"
  FOREIGN KEY ("sale_batch_allocation_id") REFERENCES "sale_batch_allocations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_return_items"
  ADD CONSTRAINT "sales_return_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_return_items"
  ADD CONSTRAINT "sales_return_items_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
