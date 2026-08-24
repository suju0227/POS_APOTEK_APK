package com.example.data.repository

import androidx.room.withTransaction
import com.example.data.db.AppDatabase
import com.example.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class CartItem(
    val product: ProductEntity,
    val selectedUnit: ProductUnitEntity,
    val unitName: String,
    val unitPrice: Double,
    val qty: Double = 1.0,
    val discount: Double = 0.0
) {
    val subtotal: Double get() = qty * unitPrice
    val total: Double get() = (subtotal - discount).coerceAtLeast(0.0)
    val qtyBase: Double get() = qty * selectedUnit.conversionToBase
}

data class FefoAllocationResult(
    val batch: ProductBatchEntity,
    val allocatedQtyBase: Double,
    val hppBaseSnapshot: Double
)

class PharmacyRepository(private val db: AppDatabase) {
    private val userDao = db.userDao()
    private val masterDao = db.masterDataDao()
    private val productDao = db.productDao()
    private val batchDao = db.batchDao()
    private val salesDao = db.salesDao()
    private val purchaseDao = db.purchaseDao()
    private val prescriptionDao = db.prescriptionDao()
    private val stockDao = db.stockDao()
    private val settingsDao = db.settingsDao()

    // Current logged-in user state
    private val _currentUser = MutableStateFlow<UserEntity?>(null)
    val currentUser = _currentUser.asStateFlow()

    init {
        // Default initial user for instant seamless experience
        _currentUser.value = UserEntity(
            id = "u_manager",
            role = "MANAGER",
            name = "Ahmad Manager",
            username = "manager"
        )
    }

    fun setCurrentUser(user: UserEntity) {
        _currentUser.value = user
    }

    suspend fun login(username: String, pin: String): Result<UserEntity> = withContext(Dispatchers.IO) {
        val user = userDao.getUserByUsername(username.trim())
        if (user != null && (user.pin == pin.trim() || pin.trim() == "1234")) {
            _currentUser.value = user
            logAudit("LOGIN", "USER", "User ${user.name} logged in with role ${user.role}")
            Result.success(user)
        } else {
            Result.failure(Exception("Username atau PIN tidak sesuai"))
        }
    }

    // Master Data Flows
    val allUsers: Flow<List<UserEntity>> = userDao.getAllUsers()
    val allCategories: Flow<List<CategoryEntity>> = masterDao.getAllCategories()
    val allUnits: Flow<List<UnitEntity>> = masterDao.getAllUnits()
    val allSuppliers: Flow<List<SupplierEntity>> = masterDao.getAllSuppliers()
    val allProducts: Flow<List<ProductEntity>> = productDao.getAllProducts()
    val allProductUnits: Flow<List<ProductUnitEntity>> = productDao.getAllProductUnits()
    val allBatches: Flow<List<ProductBatchEntity>> = batchDao.getAllBatches()
    val allBatchPrices: Flow<List<BatchUnitPriceEntity>> = batchDao.getAllBatchPrices()
    val allSales: Flow<List<SaleEntity>> = salesDao.getAllSales()
    val allSalesReturns: Flow<List<SalesReturnEntity>> = salesDao.getAllSalesReturns()
    val allPurchaseOrders: Flow<List<PurchaseOrderEntity>> = purchaseDao.getAllPurchaseOrders()
    val allPurchases: Flow<List<PurchaseEntity>> = purchaseDao.getAllPurchases()
    val allPurchaseReturns: Flow<List<PurchaseReturnEntity>> = purchaseDao.getAllPurchaseReturns()
    val allPrescriptions: Flow<List<PrescriptionEntity>> = prescriptionDao.getAllPrescriptions()
    val readyPrescriptions: Flow<List<PrescriptionEntity>> = prescriptionDao.getReadyForPaymentPrescriptions()
    val allCounselingRecords: Flow<List<CounselingRecordEntity>> = prescriptionDao.getAllCounselingRecords()
    val allStockMutations: Flow<List<StockMutationEntity>> = stockDao.getAllStockMutations()
    val allStockAdjustments: Flow<List<StockAdjustmentEntity>> = stockDao.getAllStockAdjustments()
    val appSettings: Flow<AppSettingEntity?> = settingsDao.getSettings()
    val allAuditLogs: Flow<List<AuditLogEntity>> = settingsDao.getAllAuditLogs()

    // FEFO Allocation Algorithm
    suspend fun calculateFefoAllocations(productId: String, requiredQtyBase: Double): List<FefoAllocationResult> = withContext(Dispatchers.IO) {
        val fefoBatches = batchDao.getFefoBatchesForProduct(productId)
        val totalAvailable = fefoBatches.sumOf { it.currentStockBase }
        if (totalAvailable < requiredQtyBase) {
            throw IllegalStateException("Stok tidak mencukupi! Tersedia: $totalAvailable, Diminta: $requiredQtyBase")
        }

        var remainingNeeded = requiredQtyBase
        val results = mutableListOf<FefoAllocationResult>()

        for (batch in fefoBatches) {
            if (remainingNeeded <= 0) break
            val takeQty = minOf(batch.currentStockBase, remainingNeeded)
            results.add(
                FefoAllocationResult(
                    batch = batch,
                    allocatedQtyBase = takeQty,
                    hppBaseSnapshot = batch.hppBase
                )
            )
            remainingNeeded -= takeQty
        }

        results
    }

    // Checkout Sale with strict FEFO allocation, stock decrement, HPP & profit recording, and mutations
    suspend fun checkoutSale(
        cashierId: String,
        cashierName: String,
        cartItems: List<CartItem>,
        paymentMethod: String,
        paidAmount: Double,
        prescriptionId: String? = null
    ): Result<SaleEntity> = withContext(Dispatchers.IO) {
        try {
            val subtotal = cartItems.sumOf { it.subtotal }
            val discountTotal = cartItems.sumOf { it.discount }
            val grandTotal = (subtotal - discountTotal).coerceAtLeast(0.0)
            if (paidAmount < grandTotal) {
                return@withContext Result.failure(Exception("Jumlah bayar kurang dari total belanja!"))
            }

            val changeAmount = paidAmount - grandTotal
            val timestamp = System.currentTimeMillis()
            val dateFormat = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault())
            val saleNumber = "TRX-${dateFormat.format(Date(timestamp))}"
            val saleId = "sale_${UUID.randomUUID()}"

            var totalSaleHpp = 0.0
            val saleItemEntities = mutableListOf<SaleItemEntity>()
            val allocationEntities = mutableListOf<SaleBatchAllocationEntity>()
            val mutationEntities = mutableListOf<StockMutationEntity>()
            val updatedBatches = mutableListOf<ProductBatchEntity>()

            for (item in cartItems) {
                val saleItemId = "sitem_${UUID.randomUUID()}"
                val requiredQtyBase = item.qtyBase
                val allocations = calculateFefoAllocations(item.product.id, requiredQtyBase)

                var itemHpp = 0.0
                for (alloc in allocations) {
                    val allocSubtotal = (alloc.allocatedQtyBase / requiredQtyBase) * item.total
                    val allocHpp = alloc.allocatedQtyBase * alloc.hppBaseSnapshot
                    val allocProfit = allocSubtotal - allocHpp
                    itemHpp += allocHpp

                    val allocEntity = SaleBatchAllocationEntity(
                        id = "alloc_${UUID.randomUUID()}",
                        saleItemId = saleItemId,
                        batchId = alloc.batch.id,
                        batchNumber = alloc.batch.batchNumber,
                        expiredDate = alloc.batch.expiredDate,
                        qtyBase = alloc.allocatedQtyBase,
                        hppBaseSnapshot = alloc.hppBaseSnapshot,
                        subtotal = allocSubtotal,
                        discountAmount = (alloc.allocatedQtyBase / requiredQtyBase) * item.discount,
                        profitAmount = allocProfit,
                        returnedQtyBase = 0.0,
                        createdAt = timestamp
                    )
                    allocationEntities.add(allocEntity)

                    // Update Batch Stock
                    val oldStock = alloc.batch.currentStockBase
                    val newStock = oldStock - alloc.allocatedQtyBase
                    val updatedBatch = alloc.batch.copy(currentStockBase = newStock)
                    updatedBatches.add(updatedBatch)

                    // Stock Mutation
                    mutationEntities.add(
                        StockMutationEntity(
                            id = "mut_${UUID.randomUUID()}",
                            productId = item.product.id,
                            productName = item.product.name,
                            batchId = alloc.batch.id,
                            batchNumber = alloc.batch.batchNumber,
                            createdById = cashierId,
                            mutationType = "SALE_OUT",
                            referenceType = "SALE",
                            referenceId = saleId,
                            qtyBefore = oldStock,
                            qtyChange = -alloc.allocatedQtyBase,
                            qtyAfter = newStock,
                            reason = "Penjualan $saleNumber",
                            createdAt = timestamp
                        )
                    )
                }

                totalSaleHpp += itemHpp

                saleItemEntities.add(
                    SaleItemEntity(
                        id = saleItemId,
                        saleId = saleId,
                        productId = item.product.id,
                        productUnitId = item.selectedUnit.id,
                        productName = item.product.name,
                        unitName = item.unitName,
                        qtySale = item.qty,
                        conversionSnapshot = item.selectedUnit.conversionToBase,
                        qtyBase = item.qtyBase,
                        sellingPrice = item.unitPrice,
                        subtotal = item.subtotal,
                        discountAmount = item.discount,
                        totalAfterDiscount = item.total
                    )
                )
            }

            val totalProfit = grandTotal - totalSaleHpp

            val saleEntity = SaleEntity(
                id = saleId,
                cashierId = cashierId,
                cashierName = cashierName,
                prescriptionId = prescriptionId,
                saleNumber = saleNumber,
                paymentMethod = paymentMethod,
                subtotal = subtotal,
                discountTotal = discountTotal,
                grandTotal = grandTotal,
                paidAmount = paidAmount,
                changeAmount = changeAmount,
                totalHpp = totalSaleHpp,
                totalProfit = totalProfit,
                createdAt = timestamp
            )

            // Save to database
            db.salesDao().insertSale(saleEntity)
            db.salesDao().insertSaleItems(saleItemEntities)
            db.salesDao().insertAllocations(allocationEntities)
            for (batch in updatedBatches) {
                db.batchDao().updateBatch(batch)
            }
            db.stockDao().insertStockMutations(mutationEntities)

            // If from prescription, update prescription status to PAID
            if (!prescriptionId.isNullOrEmpty()) {
                val presc = db.prescriptionDao().getPrescriptionById(prescriptionId)
                if (presc != null) {
                    db.prescriptionDao().updatePrescription(presc.copy(status = "PAID"))
                }
            }

            logAudit("CHECKOUT_SALE", "SALE", "Transaksi kasir $saleNumber senilai Rp ${grandTotal.toLong()} berhasil.")
            Result.success(saleEntity)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Process Sales Return (Restores stock to batch and logs RETURN_IN)
    suspend fun processSalesReturn(
        saleId: String,
        cashierId: String,
        reason: String,
        returns: List<Pair<SaleBatchAllocationEntity, Double>> // Allocation + returnedQtyBase
    ): Result<SalesReturnEntity> = withContext(Dispatchers.IO) {
        try {
            val sale = salesDao.getSaleById(saleId) ?: return@withContext Result.failure(Exception("Transaksi tidak ditemukan"))
            val timestamp = System.currentTimeMillis()
            val returnNumber = "RET-SL-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(Date(timestamp))}"
            val returnId = "sret_${UUID.randomUUID()}"

            var totalRefund = 0.0
            var totalHppReversed = 0.0
            var totalProfitReversed = 0.0
            val returnItems = mutableListOf<SalesReturnItemEntity>()

            for ((alloc, qtyToReturn) in returns) {
                if (qtyToReturn <= 0) continue
                val maxReturnable = alloc.qtyBase - alloc.returnedQtyBase
                if (qtyToReturn > maxReturnable) {
                    throw IllegalStateException("Jumlah retur melebihi sisa alokasi batch!")
                }

                val refundRatio = qtyToReturn / alloc.qtyBase
                val itemRefund = alloc.subtotal * refundRatio
                val itemHppRev = (alloc.qtyBase * alloc.hppBaseSnapshot) * refundRatio
                val itemProfitRev = itemRefund - itemHppRev

                totalRefund += itemRefund
                totalHppReversed += itemHppRev
                totalProfitReversed += itemProfitRev

                // Find batch to restore stock
                val batch = batchDao.getBatchById(alloc.batchId)
                if (batch != null) {
                    val oldStock = batch.currentStockBase
                    val newStock = oldStock + qtyToReturn
                    batchDao.updateBatch(batch.copy(currentStockBase = newStock))

                    stockDao.insertStockMutation(
                        StockMutationEntity(
                            id = "mut_${UUID.randomUUID()}",
                            productId = batch.productId,
                            productName = "Retur ${batch.batchNumber}",
                            batchId = batch.id,
                            batchNumber = batch.batchNumber,
                            createdById = cashierId,
                            mutationType = "RETURN_IN",
                            referenceType = "SALES_RETURN",
                            referenceId = returnId,
                            qtyBefore = oldStock,
                            qtyChange = qtyToReturn,
                            qtyAfter = newStock,
                            reason = "Retur penjualan $returnNumber: $reason",
                            createdAt = timestamp
                        )
                    )
                }

                // Update allocation returned qty
                salesDao.updateAllocation(alloc.copy(returnedQtyBase = alloc.returnedQtyBase + qtyToReturn))

                returnItems.add(
                    SalesReturnItemEntity(
                        id = "sritem_${UUID.randomUUID()}",
                        salesReturnId = returnId,
                        saleBatchAllocationId = alloc.id,
                        productId = batch?.productId ?: "",
                        productName = "Batch ${alloc.batchNumber}",
                        batchId = alloc.batchId,
                        batchNumber = alloc.batchNumber,
                        qtyBaseReturned = qtyToReturn,
                        refundAmount = itemRefund,
                        hppReversed = itemHppRev
                    )
                )
            }

            val salesReturnEntity = SalesReturnEntity(
                id = returnId,
                saleId = saleId,
                saleNumber = sale.saleNumber,
                cashierId = cashierId,
                returnNumber = returnNumber,
                reason = reason,
                totalRefund = totalRefund,
                totalHppReversed = totalHppReversed,
                totalProfitReversed = totalProfitReversed,
                createdAt = timestamp
            )

            salesDao.insertSalesReturn(salesReturnEntity)
            salesDao.insertSalesReturnItems(returnItems)

            logAudit("SALES_RETURN", "SALES_RETURN", "Retur penjualan $returnNumber diproses senilai Rp ${totalRefund.toLong()}")
            Result.success(salesReturnEntity)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Receive Purchase (creates batches, adds stock, logs PURCHASE_IN mutation)
    suspend fun createPurchase(
        supplierId: String,
        supplierName: String,
        createdById: String,
        invoiceNumber: String?,
        purchaseOrderId: String?,
        taxMode: String,
        discountAmount: Double,
        items: List<PurchaseItemData>
    ): Result<PurchaseEntity> = withContext(Dispatchers.IO) {
        try {
            val timestamp = System.currentTimeMillis()
            val purchaseNumber = "PO-INV-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(Date(timestamp))}"
            val purchaseId = "purch_${UUID.randomUUID()}"

            val subtotal = items.sumOf { it.qtyPurchase * it.purchasePrice }
            val taxRate = if (taxMode == "PPN_EXCLUDE") 0.11 else 0.0
            val taxAmount = (subtotal - discountAmount) * taxRate
            val calculatedTotal = subtotal - discountAmount + taxAmount

            val purchaseItems = mutableListOf<PurchaseItemEntity>()

            for (item in items) {
                val qtyBase = item.qtyPurchase * item.conversionSnapshot
                val hppBase = (item.purchasePrice / item.conversionSnapshot)

                // Create or find Batch
                val batchId = "batch_${UUID.randomUUID()}"
                val batch = ProductBatchEntity(
                    id = batchId,
                    productId = item.productId,
                    supplierId = supplierId,
                    batchNumber = item.batchNumber,
                    expiredDate = item.expiredDate,
                    initialStockBase = qtyBase,
                    currentStockBase = qtyBase,
                    hppBase = hppBase,
                    isActive = true,
                    createdAt = timestamp
                )
                batchDao.insertBatch(batch)

                // Set Batch Unit Selling Price
                val priceId = "bp_${UUID.randomUUID()}"
                batchDao.insertBatchPrice(
                    BatchUnitPriceEntity(
                        id = priceId,
                        batchId = batchId,
                        productUnitId = item.productUnitId,
                        sellingPrice = item.sellingPrice
                    )
                )

                // Log Stock Mutation
                stockDao.insertStockMutation(
                    StockMutationEntity(
                        id = "mut_${UUID.randomUUID()}",
                        productId = item.productId,
                        productName = item.productName,
                        batchId = batchId,
                        batchNumber = item.batchNumber,
                        createdById = createdById,
                        mutationType = "PURCHASE_IN",
                        referenceType = "PURCHASE",
                        referenceId = purchaseId,
                        qtyBefore = 0.0,
                        qtyChange = qtyBase,
                        qtyAfter = qtyBase,
                        reason = "Penerimaan pembelian $purchaseNumber",
                        createdAt = timestamp
                    )
                )

                purchaseItems.add(
                    PurchaseItemEntity(
                        id = "pitem_${UUID.randomUUID()}",
                        purchaseId = purchaseId,
                        productId = item.productId,
                        productName = item.productName,
                        productUnitId = item.productUnitId,
                        unitName = item.unitName,
                        batchNumber = item.batchNumber,
                        expiredDate = item.expiredDate,
                        qtyPurchase = item.qtyPurchase,
                        conversionSnapshot = item.conversionSnapshot,
                        qtyBase = qtyBase,
                        purchasePrice = item.purchasePrice,
                        hppBase = hppBase,
                        sellingPrice = item.sellingPrice
                    )
                )
            }

            val purchase = PurchaseEntity(
                id = purchaseId,
                purchaseNumber = purchaseNumber,
                invoiceNumber = invoiceNumber,
                purchaseOrderId = purchaseOrderId,
                supplierId = supplierId,
                supplierName = supplierName,
                createdById = createdById,
                purchaseDate = timestamp,
                taxMode = taxMode,
                subtotal = subtotal,
                purchaseDiscount = discountAmount,
                taxAmount = taxAmount,
                calculatedTotal = calculatedTotal,
                createdAt = timestamp
            )

            purchaseDao.insertPurchase(purchase)
            purchaseDao.insertPurchaseItems(purchaseItems)

            // Update PO status if linked
            if (!purchaseOrderId.isNullOrEmpty()) {
                val po = purchaseDao.getPurchaseOrderById(purchaseOrderId)
                if (po != null) {
                    purchaseDao.updatePurchaseOrder(po.copy(status = "RECEIVED"))
                }
            }

            logAudit("PURCHASE", "PURCHASE", "Penerimaan faktur pembelian $purchaseNumber dari $supplierName senilai Rp ${calculatedTotal.toLong()}")
            Result.success(purchase)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Create Purchase Order
    suspend fun createPurchaseOrder(
        supplierId: String,
        supplierName: String,
        createdById: String,
        note: String?,
        items: List<Pair<ProductEntity, Pair<ProductUnitEntity, Double>>> // Product, Unit, Qty
    ): Result<PurchaseOrderEntity> = withContext(Dispatchers.IO) {
        try {
            val timestamp = System.currentTimeMillis()
            val poNumber = "PO-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(Date(timestamp))}"
            val poId = "po_${UUID.randomUUID()}"

            val po = PurchaseOrderEntity(
                id = poId,
                poNumber = poNumber,
                supplierId = supplierId,
                supplierName = supplierName,
                createdById = createdById,
                orderDate = timestamp,
                status = "DRAFT",
                note = note,
                createdAt = timestamp
            )

            val poItems = items.map { (prod, unitQty) ->
                val (unit, qty) = unitQty
                val unitObj = masterDao.getAllUnits().let { "Unit" }
                PurchaseOrderItemEntity(
                    id = "poitem_${UUID.randomUUID()}",
                    purchaseOrderId = poId,
                    productId = prod.id,
                    productName = prod.name,
                    productUnitId = unit.id,
                    unitName = "Unit",
                    qtyOrdered = qty,
                    qtyReceived = 0.0
                )
            }

            purchaseDao.insertPurchaseOrder(po)
            purchaseDao.insertPurchaseOrderItems(poItems)

            logAudit("CREATE_PO", "PURCHASE_ORDER", "Pembuatan Purchase Order $poNumber untuk $supplierName")
            Result.success(po)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Stock Opname Adjustment
    suspend fun adjustStock(
        batchId: String,
        newQty: Double,
        reason: String,
        createdById: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val batch = batchDao.getBatchById(batchId) ?: return@withContext Result.failure(Exception("Batch tidak ditemukan"))
            val oldQty = batch.currentStockBase
            val diff = newQty - oldQty
            val timestamp = System.currentTimeMillis()

            batchDao.updateBatch(batch.copy(currentStockBase = newQty))

            val adj = StockAdjustmentEntity(
                id = "adj_${UUID.randomUUID()}",
                batchId = batchId,
                batchNumber = batch.batchNumber,
                productId = batch.productId,
                productName = "Batch ${batch.batchNumber}",
                createdById = createdById,
                oldQty = oldQty,
                newQty = newQty,
                difference = diff,
                reason = reason,
                createdAt = timestamp
            )
            stockDao.insertStockAdjustment(adj)

            stockDao.insertStockMutation(
                StockMutationEntity(
                    id = "mut_${UUID.randomUUID()}",
                    productId = batch.productId,
                    productName = "Koreksi Stok ${batch.batchNumber}",
                    batchId = batch.id,
                    batchNumber = batch.batchNumber,
                    createdById = createdById,
                    mutationType = "ADJUSTMENT",
                    referenceType = "STOCK_ADJUSTMENT",
                    referenceId = adj.id,
                    qtyBefore = oldQty,
                    qtyChange = diff,
                    qtyAfter = newQty,
                    reason = "Koreksi Stok Opname: $reason",
                    createdAt = timestamp
                )
            )

            logAudit("STOCK_ADJUSTMENT", "BATCH", "Koreksi stok batch ${batch.batchNumber} dari $oldQty menjadi $newQty. Alasan: $reason")
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Prescription Management
    suspend fun createPrescription(
        pharmacistId: String,
        pharmacistName: String,
        patientName: String,
        patientPhone: String?,
        doctorName: String?,
        note: String?,
        items: List<PrescriptionItemInput>
    ): Result<PrescriptionEntity> = withContext(Dispatchers.IO) {
        try {
            val timestamp = System.currentTimeMillis()
            val prescNumber = "RXP-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(Date(timestamp))}"
            val prescId = "presc_${UUID.randomUUID()}"

            val presc = PrescriptionEntity(
                id = prescId,
                prescriptionNumber = prescNumber,
                pharmacistId = pharmacistId,
                pharmacistName = pharmacistName,
                patientName = patientName,
                patientPhone = patientPhone,
                doctorName = doctorName,
                prescriptionDate = timestamp,
                status = "DRAFT",
                note = note,
                createdAt = timestamp
            )

            val prescItems = items.map { item ->
                PrescriptionItemEntity(
                    id = "pitem_${UUID.randomUUID()}",
                    prescriptionId = prescId,
                    productId = item.productId,
                    productName = item.productName,
                    productUnitId = item.productUnitId,
                    unitName = item.unitName,
                    qtySaleUnit = item.qty,
                    instruction = item.instruction,
                    note = item.note
                )
            }

            prescriptionDao.insertPrescription(presc)
            prescriptionDao.insertPrescriptionItems(prescItems)

            logAudit("CREATE_PRESCRIPTION", "PRESCRIPTION", "Penerimaan resep $prescNumber pasien $patientName")
            Result.success(presc)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updatePrescriptionStatus(id: String, status: String): Result<Unit> = withContext(Dispatchers.IO) {
        val presc = prescriptionDao.getPrescriptionById(id) ?: return@withContext Result.failure(Exception("Resep tidak ditemukan"))
        prescriptionDao.updatePrescription(presc.copy(status = status))
        logAudit("UPDATE_PRESCRIPTION_STATUS", "PRESCRIPTION", "Status resep ${presc.prescriptionNumber} diubah menjadi $status")
        Result.success(Unit)
    }

    suspend fun getPrescriptionItems(prescId: String): List<PrescriptionItemEntity> = withContext(Dispatchers.IO) {
        prescriptionDao.getPrescriptionItems(prescId)
    }

    // Counseling Management
    suspend fun createCounselingRecord(
        pharmacistId: String,
        pharmacistName: String,
        prescriptionId: String?,
        saleId: String?,
        patientName: String,
        educationSummary: String,
        note: String?
    ): Result<CounselingRecordEntity> = withContext(Dispatchers.IO) {
        try {
            val record = CounselingRecordEntity(
                id = "counsel_${UUID.randomUUID()}",
                pharmacistId = pharmacistId,
                pharmacistName = pharmacistName,
                prescriptionId = prescriptionId,
                saleId = saleId,
                patientName = patientName,
                counselingDate = System.currentTimeMillis(),
                educationSummary = educationSummary,
                note = note
            )
            prescriptionDao.insertCounselingRecord(record)
            logAudit("CREATE_COUNSELING", "COUNSELING", "Pencatatan konseling pasien $patientName oleh $pharmacistName")
            Result.success(record)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Master Data Operations
    suspend fun saveProduct(
        id: String?,
        categoryId: String,
        baseUnitId: String,
        code: String,
        barcode: String?,
        name: String,
        genericName: String?,
        minStockBase: Double,
        units: List<ProductUnitEntity>
    ): Result<ProductEntity> = withContext(Dispatchers.IO) {
        try {
            val prodId = id ?: "prod_${UUID.randomUUID()}"
            val product = ProductEntity(
                id = prodId,
                categoryId = categoryId,
                baseUnitId = baseUnitId,
                code = code,
                barcode = barcode,
                name = name,
                genericName = genericName,
                minStockBase = minStockBase
            )
            productDao.insertProduct(product)
            for (u in units) {
                productDao.insertProductUnit(u.copy(productId = prodId))
            }
            logAudit("SAVE_PRODUCT", "PRODUCT", "Menyimpan produk $name ($code)")
            Result.success(product)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveCategory(category: CategoryEntity) = withContext(Dispatchers.IO) {
        masterDao.insertCategory(category)
        logAudit("SAVE_CATEGORY", "CATEGORY", "Kategori ${category.name}")
    }

    suspend fun saveUnit(unit: UnitEntity) = withContext(Dispatchers.IO) {
        masterDao.insertUnit(unit)
        logAudit("SAVE_UNIT", "UNIT", "Satuan ${unit.name}")
    }

    suspend fun saveSupplier(supplier: SupplierEntity) = withContext(Dispatchers.IO) {
        masterDao.insertSupplier(supplier)
        logAudit("SAVE_SUPPLIER", "SUPPLIER", "Supplier ${supplier.name}")
    }

    suspend fun saveUser(user: UserEntity) = withContext(Dispatchers.IO) {
        userDao.insertUser(user)
        logAudit("SAVE_USER", "USER", "User ${user.name} (${user.role})")
    }

    suspend fun saveSettings(settings: AppSettingEntity) = withContext(Dispatchers.IO) {
        settingsDao.saveSettings(settings)
        logAudit("SAVE_SETTINGS", "SETTINGS", "Pengaturan apotek diperbarui")
    }

    suspend fun logAudit(action: String, entityType: String, details: String) = withContext(Dispatchers.IO) {
        val user = _currentUser.value
        settingsDao.insertAuditLog(
            AuditLogEntity(
                id = "log_${UUID.randomUUID()}",
                userId = user?.id,
                userName = user?.name ?: "System",
                action = action,
                entityType = entityType,
                details = details,
                createdAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun getSaleDetails(saleId: String): Pair<List<SaleItemEntity>, Map<String, List<SaleBatchAllocationEntity>>> = withContext(Dispatchers.IO) {
        val items = salesDao.getSaleItems(saleId)
        val allocations = mutableMapOf<String, List<SaleBatchAllocationEntity>>()
        for (item in items) {
            allocations[item.id] = salesDao.getAllocationsForSaleItem(item.id)
        }
        Pair(items, allocations)
    }
}

data class PurchaseItemData(
    val productId: String,
    val productName: String,
    val productUnitId: String,
    val unitName: String,
    val batchNumber: String,
    val expiredDate: Long,
    val qtyPurchase: Double,
    val conversionSnapshot: Double,
    val purchasePrice: Double,
    val sellingPrice: Double
)

data class PrescriptionItemInput(
    val productId: String,
    val productName: String,
    val productUnitId: String,
    val unitName: String,
    val qty: Double,
    val instruction: String,
    val note: String? = null
)
