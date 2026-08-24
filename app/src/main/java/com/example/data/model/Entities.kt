package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val role: String, // MANAGER, KASIR, APOTEKER, PEMILIK
    val name: String,
    val username: String,
    val pin: String = "1234",
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String? = null,
    val isActive: Boolean = true
)

@Serializable
@Entity(tableName = "units")
data class UnitEntity(
    @PrimaryKey val id: String,
    val name: String,
    val symbol: String? = null,
    val isActive: Boolean = true
)

@Serializable
@Entity(tableName = "suppliers")
data class SupplierEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    val contactPerson: String? = null,
    val isActive: Boolean = true
)

@Serializable
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val categoryId: String,
    val baseUnitId: String,
    val code: String,
    val barcode: String? = null,
    val name: String,
    val genericName: String? = null,
    val minStockBase: Double = 10.0,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "product_units")
data class ProductUnitEntity(
    @PrimaryKey val id: String,
    val productId: String,
    val unitId: String,
    val conversionToBase: Double, // e.g. 1 Strip = 10 Tablet (conversion = 10.0)
    val isDefaultSaleUnit: Boolean = false,
    val isSaleUnit: Boolean = true,
    val minSaleQty: Double = 1.0,
    val isActive: Boolean = true
)

@Serializable
@Entity(tableName = "product_batches")
data class ProductBatchEntity(
    @PrimaryKey val id: String,
    val productId: String,
    val supplierId: String? = null,
    val batchNumber: String,
    val expiredDate: Long, // timestamp in millis
    val initialStockBase: Double,
    val currentStockBase: Double,
    val hppBase: Double, // Modal cost per base unit
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "batch_unit_prices")
data class BatchUnitPriceEntity(
    @PrimaryKey val id: String,
    val batchId: String,
    val productUnitId: String,
    val sellingPrice: Double // Selling price per this unit
)

@Serializable
@Entity(tableName = "sales")
data class SaleEntity(
    @PrimaryKey val id: String,
    val cashierId: String,
    val cashierName: String,
    val prescriptionId: String? = null,
    val saleNumber: String,
    val paymentMethod: String, // CASH, QRIS, TRANSFER
    val subtotal: Double,
    val discountTotal: Double = 0.0,
    val grandTotal: Double,
    val paidAmount: Double,
    val changeAmount: Double,
    val totalHpp: Double = 0.0,
    val totalProfit: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "sale_items")
data class SaleItemEntity(
    @PrimaryKey val id: String,
    val saleId: String,
    val productId: String,
    val productUnitId: String,
    val productName: String,
    val unitName: String,
    val qtySale: Double,
    val conversionSnapshot: Double,
    val qtyBase: Double,
    val sellingPrice: Double,
    val subtotal: Double,
    val discountAmount: Double = 0.0,
    val totalAfterDiscount: Double
)

@Serializable
@Entity(tableName = "sale_batch_allocations")
data class SaleBatchAllocationEntity(
    @PrimaryKey val id: String,
    val saleItemId: String,
    val batchId: String,
    val batchNumber: String,
    val expiredDate: Long,
    val qtyBase: Double,
    val hppBaseSnapshot: Double,
    val subtotal: Double,
    val discountAmount: Double = 0.0,
    val profitAmount: Double = 0.0,
    val returnedQtyBase: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "sales_returns")
data class SalesReturnEntity(
    @PrimaryKey val id: String,
    val saleId: String,
    val saleNumber: String,
    val cashierId: String,
    val returnNumber: String,
    val reason: String,
    val totalRefund: Double,
    val totalHppReversed: Double,
    val totalProfitReversed: Double,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "sales_return_items")
data class SalesReturnItemEntity(
    @PrimaryKey val id: String,
    val salesReturnId: String,
    val saleBatchAllocationId: String,
    val productId: String,
    val productName: String,
    val batchId: String,
    val batchNumber: String,
    val qtyBaseReturned: Double,
    val refundAmount: Double,
    val hppReversed: Double
)

@Serializable
@Entity(tableName = "purchase_orders")
data class PurchaseOrderEntity(
    @PrimaryKey val id: String,
    val poNumber: String,
    val supplierId: String,
    val supplierName: String,
    val createdById: String,
    val orderDate: Long,
    val status: String = "DRAFT", // DRAFT, SENT, RECEIVED, CANCELLED
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "purchase_order_items")
data class PurchaseOrderItemEntity(
    @PrimaryKey val id: String,
    val purchaseOrderId: String,
    val productId: String,
    val productName: String,
    val productUnitId: String,
    val unitName: String,
    val qtyOrdered: Double,
    val qtyReceived: Double = 0.0
)

@Serializable
@Entity(tableName = "purchases")
data class PurchaseEntity(
    @PrimaryKey val id: String,
    val purchaseNumber: String,
    val invoiceNumber: String? = null,
    val purchaseOrderId: String? = null,
    val supplierId: String,
    val supplierName: String,
    val createdById: String,
    val purchaseDate: Long,
    val taxMode: String = "NON_PPN", // NON_PPN, PPN_INCLUDE, PPN_EXCLUDE
    val subtotal: Double,
    val purchaseDiscount: Double = 0.0,
    val taxAmount: Double = 0.0,
    val calculatedTotal: Double,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "purchase_items")
data class PurchaseItemEntity(
    @PrimaryKey val id: String,
    val purchaseId: String,
    val productId: String,
    val productName: String,
    val productUnitId: String,
    val unitName: String,
    val batchNumber: String,
    val expiredDate: Long,
    val qtyPurchase: Double,
    val conversionSnapshot: Double,
    val qtyBase: Double,
    val purchasePrice: Double,
    val hppBase: Double,
    val sellingPrice: Double
)

@Serializable
@Entity(tableName = "purchase_returns")
data class PurchaseReturnEntity(
    @PrimaryKey val id: String,
    val purchaseId: String? = null,
    val returnNumber: String,
    val supplierId: String,
    val supplierName: String,
    val createdById: String,
    val reason: String,
    val totalAmount: Double,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "purchase_return_items")
data class PurchaseReturnItemEntity(
    @PrimaryKey val id: String,
    val purchaseReturnId: String,
    val productId: String,
    val productName: String,
    val batchId: String,
    val batchNumber: String,
    val qtyBaseReturned: Double,
    val hppBaseSnapshot: Double,
    val totalAmount: Double
)

@Serializable
@Entity(tableName = "prescriptions")
data class PrescriptionEntity(
    @PrimaryKey val id: String,
    val prescriptionNumber: String,
    val pharmacistId: String,
    val pharmacistName: String,
    val patientName: String,
    val patientPhone: String? = null,
    val doctorName: String? = null,
    val prescriptionDate: Long = System.currentTimeMillis(),
    val status: String = "DRAFT", // DRAFT, READY_FOR_PAYMENT, PAID, CANCELLED
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "prescription_items")
data class PrescriptionItemEntity(
    @PrimaryKey val id: String,
    val prescriptionId: String,
    val productId: String,
    val productName: String,
    val productUnitId: String,
    val unitName: String,
    val qtySaleUnit: Double,
    val instruction: String,
    val note: String? = null
)

@Serializable
@Entity(tableName = "counseling_records")
data class CounselingRecordEntity(
    @PrimaryKey val id: String,
    val pharmacistId: String,
    val pharmacistName: String,
    val prescriptionId: String? = null,
    val saleId: String? = null,
    val patientName: String,
    val counselingDate: Long = System.currentTimeMillis(),
    val educationSummary: String,
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "stock_mutations")
data class StockMutationEntity(
    @PrimaryKey val id: String,
    val productId: String,
    val productName: String,
    val batchId: String,
    val batchNumber: String,
    val createdById: String,
    val mutationType: String, // PURCHASE_IN, SALE_OUT, RETURN_IN, RETURN_OUT, ADJUSTMENT
    val referenceType: String,
    val referenceId: String,
    val qtyBefore: Double,
    val qtyChange: Double,
    val qtyAfter: Double,
    val reason: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "stock_adjustments")
data class StockAdjustmentEntity(
    @PrimaryKey val id: String,
    val batchId: String,
    val batchNumber: String,
    val productId: String,
    val productName: String,
    val createdById: String,
    val oldQty: Double,
    val newQty: Double,
    val difference: Double,
    val reason: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val id: String = "default_settings",
    val pharmacyName: String = "Apotek Risyah",
    val address: String = "Jl. Poros Rappang - Pinrang, Sulawesi Selatan",
    val phone: String = "0812-3456-7890",
    val expiredAlertDays: Int = 90,
    val timezone: String = "Asia/Makassar",
    val currency: String = "IDR"
)

@Serializable
@Entity(tableName = "audit_logs")
data class AuditLogEntity(
    @PrimaryKey val id: String,
    val userId: String?,
    val userName: String?,
    val action: String,
    val entityType: String,
    val details: String,
    val createdAt: Long = System.currentTimeMillis()
)
