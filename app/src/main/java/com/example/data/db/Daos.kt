package com.example.data.db

import androidx.room.*
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE isActive = 1 ORDER BY name ASC")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Query("SELECT * FROM users WHERE id = :id LIMIT 1")
    suspend fun getUserById(id: String): UserEntity?

    @Query("SELECT * FROM users WHERE username = :username AND isActive = 1 LIMIT 1")
    suspend fun getUserByUsername(username: String): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUsers(users: List<UserEntity>)

    @Update
    suspend fun updateUser(user: UserEntity)

    @Delete
    suspend fun deleteUser(user: UserEntity)
}

@Dao
interface MasterDataDao {
    // Categories
    @Query("SELECT * FROM categories WHERE isActive = 1 ORDER BY name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Update
    suspend fun updateCategory(category: CategoryEntity)

    @Delete
    suspend fun deleteCategory(category: CategoryEntity)

    // Units
    @Query("SELECT * FROM units WHERE isActive = 1 ORDER BY name ASC")
    fun getAllUnits(): Flow<List<UnitEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnit(unit: UnitEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnits(units: List<UnitEntity>)

    @Update
    suspend fun updateUnit(unit: UnitEntity)

    @Delete
    suspend fun deleteUnit(unit: UnitEntity)

    // Suppliers
    @Query("SELECT * FROM suppliers WHERE isActive = 1 ORDER BY name ASC")
    fun getAllSuppliers(): Flow<List<SupplierEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSupplier(supplier: SupplierEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSuppliers(suppliers: List<SupplierEntity>)

    @Update
    suspend fun updateSupplier(supplier: SupplierEntity)

    @Delete
    suspend fun deleteSupplier(supplier: SupplierEntity)
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE isActive = 1 ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id LIMIT 1")
    suspend fun getProductById(id: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<ProductEntity>)

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Delete
    suspend fun deleteProduct(product: ProductEntity)

    // Product Units
    @Query("SELECT * FROM product_units WHERE productId = :productId AND isActive = 1")
    fun getProductUnits(productId: String): Flow<List<ProductUnitEntity>>

    @Query("SELECT * FROM product_units WHERE productId = :productId AND isActive = 1")
    suspend fun getProductUnitsDirect(productId: String): List<ProductUnitEntity>

    @Query("SELECT * FROM product_units WHERE id = :unitId LIMIT 1")
    suspend fun getProductUnitById(unitId: String): ProductUnitEntity?

    @Query("SELECT * FROM product_units WHERE isActive = 1")
    fun getAllProductUnits(): Flow<List<ProductUnitEntity>>

    @Query("SELECT * FROM product_units WHERE isActive = 1")
    suspend fun getAllProductUnitsDirect(): List<ProductUnitEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductUnits(units: List<ProductUnitEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductUnit(unit: ProductUnitEntity)
}

@Dao
interface BatchDao {
    @Query("SELECT * FROM product_batches WHERE isActive = 1 ORDER BY expiredDate ASC")
    fun getAllBatches(): Flow<List<ProductBatchEntity>>

    @Query("SELECT * FROM product_batches WHERE isActive = 1")
    suspend fun getAllBatchesDirect(): List<ProductBatchEntity>

    // FEFO: Get active batches for a product with stock > 0 ordered by earliest expiration date
    @Query("SELECT * FROM product_batches WHERE productId = :productId AND currentStockBase > 0 AND isActive = 1 ORDER BY expiredDate ASC")
    suspend fun getFefoBatchesForProduct(productId: String): List<ProductBatchEntity>

    @Query("SELECT * FROM product_batches WHERE productId = :productId AND isActive = 1 ORDER BY expiredDate ASC")
    fun getBatchesForProduct(productId: String): Flow<List<ProductBatchEntity>>

    @Query("SELECT * FROM product_batches WHERE id = :id LIMIT 1")
    suspend fun getBatchById(id: String): ProductBatchEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBatch(batch: ProductBatchEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBatches(batches: List<ProductBatchEntity>)

    @Update
    suspend fun updateBatch(batch: ProductBatchEntity)

    // Batch Unit Prices
    @Query("SELECT * FROM batch_unit_prices WHERE batchId = :batchId")
    suspend fun getPricesForBatch(batchId: String): List<BatchUnitPriceEntity>

    @Query("SELECT * FROM batch_unit_prices WHERE batchId = :batchId AND productUnitId = :unitId LIMIT 1")
    suspend fun getPriceForBatchAndUnit(batchId: String, unitId: String): BatchUnitPriceEntity?

    @Query("SELECT * FROM batch_unit_prices")
    fun getAllBatchPrices(): Flow<List<BatchUnitPriceEntity>>

    @Query("SELECT * FROM batch_unit_prices")
    suspend fun getAllBatchPricesDirect(): List<BatchUnitPriceEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBatchPrice(price: BatchUnitPriceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBatchPrices(prices: List<BatchUnitPriceEntity>)
}

@Dao
interface SalesDao {
    @Query("SELECT * FROM sales ORDER BY createdAt DESC")
    fun getAllSales(): Flow<List<SaleEntity>>

    @Query("SELECT * FROM sales WHERE id = :id LIMIT 1")
    suspend fun getSaleById(id: String): SaleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSale(sale: SaleEntity)

    @Query("SELECT * FROM sale_items WHERE saleId = :saleId")
    suspend fun getSaleItems(saleId: String): List<SaleItemEntity>

    @Query("SELECT * FROM sale_items WHERE saleId = :saleId")
    fun getSaleItemsFlow(saleId: String): Flow<List<SaleItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSaleItems(items: List<SaleItemEntity>)

    @Query("SELECT * FROM sale_batch_allocations WHERE saleItemId = :saleItemId")
    suspend fun getAllocationsForSaleItem(saleItemId: String): List<SaleBatchAllocationEntity>

    @Query("SELECT * FROM sale_batch_allocations WHERE id = :id LIMIT 1")
    suspend fun getAllocationById(id: String): SaleBatchAllocationEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllocations(allocations: List<SaleBatchAllocationEntity>)

    @Update
    suspend fun updateAllocation(allocation: SaleBatchAllocationEntity)

    // Returns
    @Query("SELECT * FROM sales_returns ORDER BY createdAt DESC")
    fun getAllSalesReturns(): Flow<List<SalesReturnEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSalesReturn(salesReturn: SalesReturnEntity)

    @Query("SELECT * FROM sales_return_items WHERE salesReturnId = :returnId")
    suspend fun getSalesReturnItems(returnId: String): List<SalesReturnItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSalesReturnItems(items: List<SalesReturnItemEntity>)
}

@Dao
interface PurchaseDao {
    // Purchase Orders
    @Query("SELECT * FROM purchase_orders ORDER BY createdAt DESC")
    fun getAllPurchaseOrders(): Flow<List<PurchaseOrderEntity>>

    @Query("SELECT * FROM purchase_orders WHERE id = :id LIMIT 1")
    suspend fun getPurchaseOrderById(id: String): PurchaseOrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseOrder(order: PurchaseOrderEntity)

    @Update
    suspend fun updatePurchaseOrder(order: PurchaseOrderEntity)

    @Query("SELECT * FROM purchase_order_items WHERE purchaseOrderId = :orderId")
    suspend fun getPurchaseOrderItems(orderId: String): List<PurchaseOrderItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseOrderItems(items: List<PurchaseOrderItemEntity>)

    // Purchases
    @Query("SELECT * FROM purchases ORDER BY createdAt DESC")
    fun getAllPurchases(): Flow<List<PurchaseEntity>>

    @Query("SELECT * FROM purchases WHERE id = :id LIMIT 1")
    suspend fun getPurchaseById(id: String): PurchaseEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchase(purchase: PurchaseEntity)

    @Query("SELECT * FROM purchase_items WHERE purchaseId = :purchaseId")
    suspend fun getPurchaseItems(purchaseId: String): List<PurchaseItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseItems(items: List<PurchaseItemEntity>)

    // Purchase Returns
    @Query("SELECT * FROM purchase_returns ORDER BY createdAt DESC")
    fun getAllPurchaseReturns(): Flow<List<PurchaseReturnEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseReturn(purchaseReturn: PurchaseReturnEntity)

    @Query("SELECT * FROM purchase_return_items WHERE purchaseReturnId = :returnId")
    suspend fun getPurchaseReturnItems(returnId: String): List<PurchaseReturnItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseReturnItems(items: List<PurchaseReturnItemEntity>)
}

@Dao
interface PrescriptionDao {
    @Query("SELECT * FROM prescriptions ORDER BY createdAt DESC")
    fun getAllPrescriptions(): Flow<List<PrescriptionEntity>>

    @Query("SELECT * FROM prescriptions WHERE status = 'READY_FOR_PAYMENT' ORDER BY createdAt DESC")
    fun getReadyForPaymentPrescriptions(): Flow<List<PrescriptionEntity>>

    @Query("SELECT * FROM prescriptions WHERE id = :id LIMIT 1")
    suspend fun getPrescriptionById(id: String): PrescriptionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrescription(prescription: PrescriptionEntity)

    @Update
    suspend fun updatePrescription(prescription: PrescriptionEntity)

    @Query("SELECT * FROM prescription_items WHERE prescriptionId = :prescriptionId")
    suspend fun getPrescriptionItems(prescriptionId: String): List<PrescriptionItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrescriptionItems(items: List<PrescriptionItemEntity>)

    // Counseling
    @Query("SELECT * FROM counseling_records ORDER BY counselingDate DESC")
    fun getAllCounselingRecords(): Flow<List<CounselingRecordEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCounselingRecord(record: CounselingRecordEntity)
}

@Dao
interface StockDao {
    @Query("SELECT * FROM stock_mutations ORDER BY createdAt DESC")
    fun getAllStockMutations(): Flow<List<StockMutationEntity>>

    @Query("SELECT * FROM stock_mutations WHERE productId = :productId ORDER BY createdAt DESC")
    fun getStockMutationsForProduct(productId: String): Flow<List<StockMutationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStockMutation(mutation: StockMutationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStockMutations(mutations: List<StockMutationEntity>)

    @Query("SELECT * FROM stock_adjustments ORDER BY createdAt DESC")
    fun getAllStockAdjustments(): Flow<List<StockAdjustmentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStockAdjustment(adjustment: StockAdjustmentEntity)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM app_settings WHERE id = 'default_settings' LIMIT 1")
    fun getSettings(): Flow<AppSettingEntity?>

    @Query("SELECT * FROM app_settings WHERE id = 'default_settings' LIMIT 1")
    suspend fun getSettingsDirect(): AppSettingEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSettings(settings: AppSettingEntity)

    // Audit logs
    @Query("SELECT * FROM audit_logs ORDER BY createdAt DESC")
    fun getAllAuditLogs(): Flow<List<AuditLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAuditLog(log: AuditLogEntity)
}
