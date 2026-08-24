CREATE TABLE "purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplier_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "purchase_number" VARCHAR(100) NOT NULL,
  "invoice_number" VARCHAR(100),
  "purchase_date" DATE NOT NULL,
  "subtotal" DECIMAL(18, 2) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchases_subtotal_check" CHECK ("subtotal" >= 0)
);

CREATE TABLE "purchase_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchase_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_unit_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "batch_number" VARCHAR(100) NOT NULL,
  "expired_date" DATE NOT NULL,
  "qty_purchase" DECIMAL(18, 4) NOT NULL,
  "conversion_snapshot" DECIMAL(18, 4) NOT NULL,
  "qty_base" DECIMAL(18, 4) NOT NULL,
  "purchase_price" DECIMAL(18, 2) NOT NULL,
  "hpp_base" DECIMAL(18, 4) NOT NULL,
  "total_price" DECIMAL(18, 2) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_items_qty_purchase_check" CHECK ("qty_purchase" > 0),
  CONSTRAINT "purchase_items_conversion_snapshot_check" CHECK ("conversion_snapshot" > 0),
  CONSTRAINT "purchase_items_qty_base_check" CHECK ("qty_base" > 0),
  CONSTRAINT "purchase_items_purchase_price_check" CHECK ("purchase_price" >= 0),
  CONSTRAINT "purchase_items_hpp_base_check" CHECK ("hpp_base" >= 0),
  CONSTRAINT "purchase_items_total_price_check" CHECK ("total_price" >= 0)
);

CREATE TABLE "stock_mutations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "mutation_type" VARCHAR(50) NOT NULL,
  "reference_type" VARCHAR(50) NOT NULL,
  "reference_id" UUID NOT NULL,
  "qty_before" DECIMAL(18, 4) NOT NULL,
  "qty_change" DECIMAL(18, 4) NOT NULL,
  "qty_after" DECIMAL(18, 4) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_mutations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_mutations_qty_change_check" CHECK ("qty_change" <> 0),
  CONSTRAINT "stock_mutations_qty_after_check" CHECK ("qty_after" >= 0)
);

CREATE UNIQUE INDEX "purchases_purchase_number_key" ON "purchases"("purchase_number");
CREATE INDEX "idx_purchases_supplier_id" ON "purchases"("supplier_id");
CREATE INDEX "idx_purchases_created_by_id" ON "purchases"("created_by_id");
CREATE INDEX "idx_purchases_purchase_date" ON "purchases"("purchase_date");
CREATE INDEX "idx_purchase_items_purchase_id" ON "purchase_items"("purchase_id");
CREATE INDEX "idx_purchase_items_product_id" ON "purchase_items"("product_id");
CREATE INDEX "idx_purchase_items_product_unit_id" ON "purchase_items"("product_unit_id");
CREATE INDEX "idx_purchase_items_batch_id" ON "purchase_items"("batch_id");
CREATE INDEX "idx_stock_mutations_product_id" ON "stock_mutations"("product_id");
CREATE INDEX "idx_stock_mutations_batch_id" ON "stock_mutations"("batch_id");
CREATE INDEX "idx_stock_mutations_created_by_id" ON "stock_mutations"("created_by_id");
CREATE INDEX "idx_stock_mutations_mutation_type" ON "stock_mutations"("mutation_type");
CREATE INDEX "idx_stock_mutations_reference" ON "stock_mutations"("reference_type", "reference_id");
CREATE INDEX "idx_stock_mutations_created_at" ON "stock_mutations"("created_at");

ALTER TABLE "purchases"
ADD CONSTRAINT "purchases_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchases"
ADD CONSTRAINT "purchases_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_purchase_id_fkey"
FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_product_unit_id_fkey"
FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_mutations"
ADD CONSTRAINT "stock_mutations_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_mutations"
ADD CONSTRAINT "stock_mutations_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_mutations"
ADD CONSTRAINT "stock_mutations_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
