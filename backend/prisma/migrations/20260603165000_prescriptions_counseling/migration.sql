ALTER TABLE "sales"
  ADD COLUMN "prescription_id" UUID;

CREATE TABLE "prescriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pharmacist_id" UUID NOT NULL,
  "prescription_number" VARCHAR(100) NOT NULL,
  "patient_name" VARCHAR(150) NOT NULL,
  "patient_phone" VARCHAR(50),
  "doctor_name" VARCHAR(150),
  "prescription_date" DATE NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "ready_at" TIMESTAMP(6),
  "paid_at" TIMESTAMP(6),
  "cancelled_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),

  CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prescription_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prescription_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_unit_id" UUID NOT NULL,
  "qty_sale_unit" NUMERIC(18,4) NOT NULL,
  "instruction" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "counseling_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pharmacist_id" UUID NOT NULL,
  "prescription_id" UUID,
  "sale_id" UUID,
  "patient_name" VARCHAR(150),
  "counseling_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "education_summary" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "deleted_at" TIMESTAMP(6),

  CONSTRAINT "counseling_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prescriptions_prescription_number_key"
  ON "prescriptions"("prescription_number");

CREATE UNIQUE INDEX "sales_prescription_id_key"
  ON "sales"("prescription_id");

CREATE INDEX "idx_sales_prescription_id"
  ON "sales"("prescription_id");

CREATE INDEX "idx_prescriptions_pharmacist_id"
  ON "prescriptions"("pharmacist_id");

CREATE INDEX "idx_prescriptions_status"
  ON "prescriptions"("status");

CREATE INDEX "idx_prescriptions_prescription_date"
  ON "prescriptions"("prescription_date");

CREATE INDEX "idx_prescription_items_prescription_id"
  ON "prescription_items"("prescription_id");

CREATE INDEX "idx_prescription_items_product_id"
  ON "prescription_items"("product_id");

CREATE INDEX "idx_prescription_items_product_unit_id"
  ON "prescription_items"("product_unit_id");

CREATE INDEX "idx_counseling_records_pharmacist_id"
  ON "counseling_records"("pharmacist_id");

CREATE INDEX "idx_counseling_records_prescription_id"
  ON "counseling_records"("prescription_id");

CREATE INDEX "idx_counseling_records_sale_id"
  ON "counseling_records"("sale_id");

CREATE INDEX "idx_counseling_records_counseling_date"
  ON "counseling_records"("counseling_date");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_prescription_id_fkey"
  FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "prescriptions"
  ADD CONSTRAINT "prescriptions_pharmacist_id_fkey"
  FOREIGN KEY ("pharmacist_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescription_items"
  ADD CONSTRAINT "prescription_items_prescription_id_fkey"
  FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescription_items"
  ADD CONSTRAINT "prescription_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescription_items"
  ADD CONSTRAINT "prescription_items_product_unit_id_fkey"
  FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counseling_records"
  ADD CONSTRAINT "counseling_records_pharmacist_id_fkey"
  FOREIGN KEY ("pharmacist_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counseling_records"
  ADD CONSTRAINT "counseling_records_prescription_id_fkey"
  FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "counseling_records"
  ADD CONSTRAINT "counseling_records_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
