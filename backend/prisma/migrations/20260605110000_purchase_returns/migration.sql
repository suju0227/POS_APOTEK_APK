CREATE TABLE "purchase_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchase_id" UUID,
  "created_by_id" UUID NOT NULL,
  "return_number" VARCHAR(100) NOT NULL,
  "reason" TEXT NOT NULL,
  "total_amount" NUMERIC(18,8) NOT NULL DEFAULT 0,
  "status" VARCHAR(50) NOT NULL DEFAULT 'FINAL',
  "idempotency_key" VARCHAR(150),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchase_return_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "qty_base_returned" NUMERIC(18,4) NOT NULL,
  "hpp_base_snapshot" NUMERIC(18,8) NOT NULL,
  "total_amount" NUMERIC(18,8) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_returns_return_number_key"
  ON "purchase_returns"("return_number");

CREATE INDEX "idx_purchase_returns_purchase_id"
  ON "purchase_returns"("purchase_id");

CREATE INDEX "idx_purchase_returns_created_by_id"
  ON "purchase_returns"("created_by_id");

CREATE INDEX "idx_purchase_returns_created_at"
  ON "purchase_returns"("created_at");

CREATE INDEX "idx_purchase_return_items_purchase_return_id"
  ON "purchase_return_items"("purchase_return_id");

CREATE INDEX "idx_purchase_return_items_product_id"
  ON "purchase_return_items"("product_id");

CREATE INDEX "idx_purchase_return_items_batch_id"
  ON "purchase_return_items"("batch_id");

ALTER TABLE "purchase_returns"
  ADD CONSTRAINT "purchase_returns_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_returns"
  ADD CONSTRAINT "purchase_returns_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
  ADD CONSTRAINT "purchase_return_items_purchase_return_id_fkey"
  FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
  ADD CONSTRAINT "purchase_return_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
  ADD CONSTRAINT "purchase_return_items_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
