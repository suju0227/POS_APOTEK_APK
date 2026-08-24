CREATE TABLE "stock_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "old_qty" DECIMAL(18, 4) NOT NULL,
  "new_qty" DECIMAL(18, 4) NOT NULL,
  "difference" DECIMAL(18, 4) NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustments_old_qty_check" CHECK ("old_qty" >= 0),
  CONSTRAINT "stock_adjustments_new_qty_check" CHECK ("new_qty" >= 0),
  CONSTRAINT "stock_adjustments_difference_check" CHECK ("difference" <> 0)
);

CREATE INDEX "idx_stock_adjustments_batch_id" ON "stock_adjustments"("batch_id");
CREATE INDEX "idx_stock_adjustments_created_by_id" ON "stock_adjustments"("created_by_id");
CREATE INDEX "idx_stock_adjustments_created_at" ON "stock_adjustments"("created_at");

ALTER TABLE "stock_adjustments"
ADD CONSTRAINT "stock_adjustments_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_adjustments"
ADD CONSTRAINT "stock_adjustments_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
