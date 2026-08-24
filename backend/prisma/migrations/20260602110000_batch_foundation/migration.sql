CREATE TABLE "product_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "supplier_id" UUID,
  "batch_number" VARCHAR(100) NOT NULL,
  "expired_date" DATE NOT NULL,
  "initial_stock_base" DECIMAL(18, 4) NOT NULL,
  "current_stock_base" DECIMAL(18, 4) NOT NULL,
  "hpp_base" DECIMAL(18, 4) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_batches_initial_stock_base_check" CHECK ("initial_stock_base" >= 0),
  CONSTRAINT "product_batches_current_stock_base_check" CHECK ("current_stock_base" >= 0),
  CONSTRAINT "product_batches_hpp_base_check" CHECK ("hpp_base" >= 0)
);

CREATE TABLE "batch_unit_prices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "product_unit_id" UUID NOT NULL,
  "selling_price" DECIMAL(18, 2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "batch_unit_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "batch_unit_prices_selling_price_check" CHECK ("selling_price" >= 0)
);

CREATE UNIQUE INDEX "uq_product_batches_product_batch_active" ON "product_batches"("product_id", "batch_number") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "uq_batch_unit_prices_batch_product_unit_active" ON "batch_unit_prices"("batch_id", "product_unit_id") WHERE "deleted_at" IS NULL;

CREATE INDEX "idx_product_batches_product_id" ON "product_batches"("product_id");
CREATE INDEX "idx_product_batches_supplier_id" ON "product_batches"("supplier_id");
CREATE INDEX "idx_product_batches_expired_date" ON "product_batches"("expired_date");
CREATE INDEX "idx_product_batches_is_active" ON "product_batches"("is_active");
CREATE INDEX "idx_batch_unit_prices_batch_id" ON "batch_unit_prices"("batch_id");
CREATE INDEX "idx_batch_unit_prices_product_unit_id" ON "batch_unit_prices"("product_unit_id");

ALTER TABLE "product_batches"
ADD CONSTRAINT "product_batches_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_batches"
ADD CONSTRAINT "product_batches_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_unit_prices"
ADD CONSTRAINT "batch_unit_prices_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "batch_unit_prices"
ADD CONSTRAINT "batch_unit_prices_product_unit_id_fkey"
FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
