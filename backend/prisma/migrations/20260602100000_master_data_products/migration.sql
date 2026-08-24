CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "base_unit_id" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "barcode" VARCHAR(100),
  "name" VARCHAR(200) NOT NULL,
  "generic_name" VARCHAR(200),
  "min_stock_base" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "conversion_to_base" DECIMAL(18, 4) NOT NULL,
  "is_default_sale_unit" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),
  CONSTRAINT "product_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_units_conversion_to_base_check" CHECK ("conversion_to_base" > 0),
  CONSTRAINT "product_units_default_requires_active_check" CHECK ("is_default_sale_unit" = false OR "is_active" = true)
);

CREATE UNIQUE INDEX "uq_products_code_active" ON "products"("code") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "uq_products_barcode_active" ON "products"("barcode") WHERE "barcode" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "uq_products_name_active" ON "products"("name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "uq_product_units_product_unit_active" ON "product_units"("product_id", "unit_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "uq_product_units_default_active" ON "product_units"("product_id") WHERE "is_default_sale_unit" = true AND "deleted_at" IS NULL;

CREATE INDEX "idx_products_category_id" ON "products"("category_id");
CREATE INDEX "idx_products_base_unit_id" ON "products"("base_unit_id");
CREATE INDEX "idx_products_name" ON "products"("name");
CREATE INDEX "idx_products_code" ON "products"("code");
CREATE INDEX "idx_products_barcode" ON "products"("barcode");
CREATE INDEX "idx_product_units_product_id" ON "product_units"("product_id");
CREATE INDEX "idx_product_units_unit_id" ON "product_units"("unit_id");

ALTER TABLE "products"
ADD CONSTRAINT "products_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_base_unit_id_fkey"
FOREIGN KEY ("base_unit_id") REFERENCES "units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_units"
ADD CONSTRAINT "product_units_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_units"
ADD CONSTRAINT "product_units_unit_id_fkey"
FOREIGN KEY ("unit_id") REFERENCES "units"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
