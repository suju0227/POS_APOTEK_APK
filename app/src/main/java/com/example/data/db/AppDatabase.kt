package com.example.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

@Database(
    entities = [
        UserEntity::class,
        CategoryEntity::class,
        UnitEntity::class,
        SupplierEntity::class,
        ProductEntity::class,
        ProductUnitEntity::class,
        ProductBatchEntity::class,
        BatchUnitPriceEntity::class,
        SaleEntity::class,
        SaleItemEntity::class,
        SaleBatchAllocationEntity::class,
        SalesReturnEntity::class,
        SalesReturnItemEntity::class,
        PurchaseOrderEntity::class,
        PurchaseOrderItemEntity::class,
        PurchaseEntity::class,
        PurchaseItemEntity::class,
        PurchaseReturnEntity::class,
        PurchaseReturnItemEntity::class,
        PrescriptionEntity::class,
        PrescriptionItemEntity::class,
        CounselingRecordEntity::class,
        StockMutationEntity::class,
        StockAdjustmentEntity::class,
        AppSettingEntity::class,
        AuditLogEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun masterDataDao(): MasterDataDao
    abstract fun productDao(): ProductDao
    abstract fun batchDao(): BatchDao
    abstract fun salesDao(): SalesDao
    abstract fun purchaseDao(): PurchaseDao
    abstract fun prescriptionDao(): PrescriptionDao
    abstract fun stockDao(): StockDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "pos_apotek_database"
                )
                    .addCallback(DatabaseCallback())
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class DatabaseCallback : Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                CoroutineScope(Dispatchers.IO).launch {
                    populateInitialData(database)
                }
            }
        }

        private suspend fun populateInitialData(database: AppDatabase) {
            val userDao = database.userDao()
            val masterDao = database.masterDataDao()
            val productDao = database.productDao()
            val batchDao = database.batchDao()
            val settingsDao = database.settingsDao()

            // 1. Users
            val users = listOf(
                UserEntity(
                    id = "u_manager",
                    role = "MANAGER",
                    name = "Ahmad Manager",
                    username = "manager",
                    pin = "1234"
                ),
                UserEntity(
                    id = "u_kasir",
                    role = "KASIR",
                    name = "Siti Kasir",
                    username = "kasir",
                    pin = "1234"
                ),
                UserEntity(
                    id = "u_apoteker",
                    role = "APOTEKER",
                    name = "apt. Risyah, S.Farm",
                    username = "apoteker",
                    pin = "1234"
                ),
                UserEntity(
                    id = "u_pemilik",
                    role = "PEMILIK",
                    name = "H. Umar (Pemilik)",
                    username = "pemilik",
                    pin = "1234"
                )
            )
            userDao.insertUsers(users)

            // 2. Settings
            settingsDao.saveSettings(
                AppSettingEntity(
                    id = "default_settings",
                    pharmacyName = "Apotek Risyah",
                    address = "Jl. Poros Rappang - Pinrang Km. 3, Sidrap",
                    phone = "0812-4567-8910",
                    expiredAlertDays = 90,
                    timezone = "Asia/Makassar",
                    currency = "IDR"
                )
            )

            // 3. Categories
            val catObatBebas = CategoryEntity("cat_1", "Obat Bebas", "Obat dengan tanda lingkaran hijau")
            val catObatKeras = CategoryEntity("cat_2", "Obat Keras", "Obat dengan tanda lingkaran merah (K)")
            val catObatTerbatas = CategoryEntity("cat_3", "Obat Bebas Terbatas", "Obat dengan tanda lingkaran biru")
            val catAlkes = CategoryEntity("cat_4", "Alat Kesehatan", "Peralatan medis dan perawatan")
            val catVitamin = CategoryEntity("cat_5", "Vitamin & Suplemen", "Suplemen daya tahan tubuh")
            masterDao.insertCategories(listOf(catObatBebas, catObatKeras, catObatTerbatas, catAlkes, catVitamin))

            // 4. Units
            val unitTablet = UnitEntity("unit_tab", "Tablet", "Tab")
            val unitStrip = UnitEntity("unit_str", "Strip", "Str")
            val unitBox = UnitEntity("unit_box", "Box", "Box")
            val unitBotol = UnitEntity("unit_btl", "Botol", "Btl")
            val unitTube = UnitEntity("unit_tbe", "Tube", "Tub")
            val unitPcs = UnitEntity("unit_pcs", "Pcs", "Pcs")
            masterDao.insertUnits(listOf(unitTablet, unitStrip, unitBox, unitBotol, unitTube, unitPcs))

            // 5. Suppliers
            val supKalbe = SupplierEntity("sup_1", "PT Kalbe Farma Tbk", "021-42873888", "Jakarta Timur", "Budi")
            val supKimiaFarma = SupplierEntity("sup_2", "PT Kimia Farma Trading", "021-3847709", "Jakarta Pusat", "Andi")
            val supEnseval = SupplierEntity("sup_3", "PT Enseval Putera Megatrading", "0411-512345", "Makassar", "Rahman")
            masterDao.insertSuppliers(listOf(supKalbe, supKimiaFarma, supEnseval))

            // 6. Products
            val now = System.currentTimeMillis()
            val dayMillis = 86400000L

            // Product 1: Paracetamol 500mg (Base: Tablet)
            val p1 = ProductEntity("prod_1", "cat_1", "unit_tab", "PCT-500", "899123456701", "Paracetamol 500 mg", "Paracetamol", 20.0)
            // Units for P1: Tablet (1), Strip (10 Tab), Box (100 Tab)
            val pu1_tab = ProductUnitEntity("pu_1_tab", "prod_1", "unit_tab", 1.0, isDefaultSaleUnit = false, isSaleUnit = true)
            val pu1_str = ProductUnitEntity("pu_1_str", "prod_1", "unit_str", 10.0, isDefaultSaleUnit = true, isSaleUnit = true)
            val pu1_box = ProductUnitEntity("pu_1_box", "prod_1", "unit_box", 100.0, isDefaultSaleUnit = false, isSaleUnit = true)

            // Batches for P1:
            // Batch A (Earliest expiry - FEFO first): Expire in 60 days
            val b1_a = ProductBatchEntity("b_1_a", "prod_1", "sup_1", "B-PCT-01", now + 60 * dayMillis, 500.0, 150.0, 250.0)
            // Batch B (Later expiry): Expire in 365 days
            val b1_b = ProductBatchEntity("b_1_b", "prod_1", "sup_1", "B-PCT-02", now + 365 * dayMillis, 500.0, 500.0, 260.0)

            // Prices for P1 Batch A
            val bp1_a_tab = BatchUnitPriceEntity("bp_1_a_tab", "b_1_a", "pu_1_tab", 500.0)
            val bp1_a_str = BatchUnitPriceEntity("bp_1_a_str", "b_1_a", "pu_1_str", 4500.0)
            val bp1_a_box = BatchUnitPriceEntity("bp_1_a_box", "b_1_a", "pu_1_box", 40000.0)

            // Prices for P1 Batch B
            val bp1_b_tab = BatchUnitPriceEntity("bp_1_b_tab", "b_1_b", "pu_1_tab", 500.0)
            val bp1_b_str = BatchUnitPriceEntity("bp_1_b_str", "b_1_b", "pu_1_str", 4500.0)
            val bp1_b_box = BatchUnitPriceEntity("bp_1_b_box", "b_1_b", "pu_1_box", 40000.0)

            // Product 2: Amoxicillin 500mg (Base: Tablet)
            val p2 = ProductEntity("prod_2", "cat_2", "unit_tab", "AMX-500", "899123456702", "Amoxicillin 500 mg", "Amoxicillin Trihydrate", 30.0)
            val pu2_tab = ProductUnitEntity("pu_2_tab", "prod_2", "unit_tab", 1.0, isDefaultSaleUnit = false, isSaleUnit = true)
            val pu2_str = ProductUnitEntity("pu_2_str", "prod_2", "unit_str", 10.0, isDefaultSaleUnit = true, isSaleUnit = true)
            val b2_a = ProductBatchEntity("b_2_a", "prod_2", "sup_2", "B-AMX-24A", now + 180 * dayMillis, 300.0, 80.0, 600.0)
            val bp2_a_tab = BatchUnitPriceEntity("bp_2_a_tab", "b_2_a", "pu_2_tab", 1000.0)
            val bp2_a_str = BatchUnitPriceEntity("bp_2_a_str", "b_2_a", "pu_2_str", 9000.0)

            // Product 3: Antasida Doen Suspensi (Base: Botol)
            val p3 = ProductEntity("prod_3", "cat_1", "unit_btl", "ANT-SUSP", "899123456703", "Antasida Doen Sirup 60ml", "Aluminium Hydroxide & Magnesium", 10.0)
            val pu3_btl = ProductUnitEntity("pu_3_btl", "prod_3", "unit_btl", 1.0, isDefaultSaleUnit = true, isSaleUnit = true)
            val b3_a = ProductBatchEntity("b_3_a", "prod_3", "sup_3", "B-ANT-90", now + 240 * dayMillis, 50.0, 35.0, 4500.0)
            val bp3_a_btl = BatchUnitPriceEntity("bp_3_a_btl", "b_3_a", "pu_3_btl", 7000.0)

            // Product 4: Cetirizine 10mg (Base: Tablet)
            val p4 = ProductEntity("prod_4", "cat_3", "unit_tab", "CTZ-10", "899123456704", "Cetirizine 10 mg", "Cetirizine HCl", 15.0)
            val pu4_tab = ProductUnitEntity("pu_4_tab", "prod_4", "unit_tab", 1.0, isDefaultSaleUnit = false, isSaleUnit = true)
            val pu4_str = ProductUnitEntity("pu_4_str", "prod_4", "unit_str", 10.0, isDefaultSaleUnit = true, isSaleUnit = true)
            val b4_a = ProductBatchEntity("b_4_a", "prod_4", "sup_1", "B-CTZ-08", now + 400 * dayMillis, 200.0, 120.0, 350.0)
            val bp4_a_tab = BatchUnitPriceEntity("bp_4_a_tab", "b_4_a", "pu_4_tab", 700.0)
            val bp4_a_str = BatchUnitPriceEntity("bp_4_a_str", "b_4_a", "pu_4_str", 6000.0)

            // Product 5: Vitamin C 500mg IPI (Base: Botol)
            val p5 = ProductEntity("prod_5", "cat_5", "unit_btl", "VIT-C-IPI", "899123456705", "Vitamin C IPI 45 Tablet", "Ascorbic Acid", 10.0)
            val pu5_btl = ProductUnitEntity("pu_5_btl", "prod_5", "unit_btl", 1.0, isDefaultSaleUnit = true, isSaleUnit = true)
            val b5_a = ProductBatchEntity("b_5_a", "prod_5", "sup_3", "B-VTC-2026", now + 500 * dayMillis, 100.0, 45.0, 5000.0)
            val bp5_a_btl = BatchUnitPriceEntity("bp_5_a_btl", "b_5_a", "pu_5_btl", 8500.0)

            productDao.insertProducts(listOf(p1, p2, p3, p4, p5))
            productDao.insertProductUnits(listOf(pu1_tab, pu1_str, pu1_box, pu2_tab, pu2_str, pu3_btl, pu4_tab, pu4_str, pu5_btl))
            batchDao.insertBatches(listOf(b1_a, b1_b, b2_a, b3_a, b4_a, b5_a))
            batchDao.insertBatchPrices(listOf(bp1_a_tab, bp1_a_str, bp1_a_box, bp1_b_tab, bp1_b_str, bp1_b_box, bp2_a_tab, bp2_a_str, bp3_a_btl, bp4_a_tab, bp4_a_str, bp5_a_btl))

            // Sample Prescription (Ready for payment)
            val prescDao = database.prescriptionDao()
            val presc1 = PrescriptionEntity(
                id = "presc_sample_1",
                prescriptionNumber = "RXP-20260824-001",
                pharmacistId = "u_apoteker",
                pharmacistName = "apt. Risyah, S.Farm",
                patientName = "Ny. Mardiana (45 th)",
                patientPhone = "0813-9876-5432",
                doctorName = "dr. H. Syarifuddin, Sp.PD",
                prescriptionDate = now,
                status = "READY_FOR_PAYMENT",
                note = "Pasien demam batuk 3 hari"
            )
            prescDao.insertPrescription(presc1)
            prescDao.insertPrescriptionItems(
                listOf(
                    PrescriptionItemEntity(
                        id = "pi_1",
                        prescriptionId = "presc_sample_1",
                        productId = "prod_1",
                        productName = "Paracetamol 500 mg",
                        productUnitId = "pu_1_str",
                        unitName = "Strip",
                        qtySaleUnit = 2.0,
                        instruction = "3 x sehari 1 tablet sesudah makan bila demam"
                    ),
                    PrescriptionItemEntity(
                        id = "pi_2",
                        prescriptionId = "presc_sample_1",
                        productId = "prod_2",
                        productName = "Amoxicillin 500 mg",
                        productUnitId = "pu_2_str",
                        unitName = "Strip",
                        qtySaleUnit = 2.0,
                        instruction = "3 x sehari 1 tablet sesudah makan harus dihabiskan"
                    )
                )
            )
        }
    }
}
