package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.data.model.*
import com.example.data.repository.PharmacyRepository
import com.example.data.repository.PurchaseItemData
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun PurchaseScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allPurchases by repository.allPurchases.collectAsState(initial = emptyList())
    val allSuppliers by repository.allSuppliers.collectAsState(initial = emptyList())
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allProductUnits by repository.allProductUnits.collectAsState(initial = emptyList())
    val allUnits by repository.allUnits.collectAsState(initial = emptyList())

    val unitsMap = remember(allUnits) { allUnits.associateBy { it.id } }
    val productUnitsMap = remember(allProductUnits) { allProductUnits.groupBy { it.productId } }

    var showCreateDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Pembelian & Penerimaan Stok Supplier",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick,
                actions = {
                    IconButton(onClick = { onNavigateTo(Screen.PurchaseOrder) }) {
                        Icon(Icons.Default.ListAlt, contentDescription = "Pemesanan PO", tint = Color.White)
                    }
                }
            )
        },
        floatingActionButton = {
            if (currentUser?.role == "MANAGER") {
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Emerald600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Faktur Pembelian Baru")
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50)
        ) {
            if (allPurchases.isEmpty()) {
                EmptyStateView(
                    title = "Belum Ada Faktur Pembelian",
                    description = "Catat faktur masuk dari PBF/Supplier untuk menambah stok batch.",
                    icon = Icons.Default.Inventory2
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(allPurchases) { purch ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(14.dp)
                                    .fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(CircleShape)
                                        .background(Emerald50),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.LocalShipping, contentDescription = null, tint = Emerald700, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = purch.purchaseNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate800
                                    )
                                    Text(
                                        text = "Supplier: ${purch.supplierName}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Slate700
                                    )
                                    Text(
                                        text = "No. Faktur: ${purch.invoiceNumber ?: "-"} • ${formatDateTime(purch.createdAt)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate500
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = formatRupiah(purch.calculatedTotal),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald700
                                    )
                                    StatusBadge(
                                        text = purch.taxMode,
                                        containerColor = Slate100,
                                        contentColor = Slate600
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        var selectedSupplierId by remember { mutableStateOf(allSuppliers.firstOrNull()?.id ?: "") }
        var invoiceNumber by remember { mutableStateOf("") }
        var taxMode by remember { mutableStateOf("NON_PPN") }
        var itemsInput by remember { mutableStateOf<List<PurchaseItemData>>(emptyList()) }

        // Item Form
        var selectedProdId by remember { mutableStateOf(allProducts.firstOrNull()?.id ?: "") }
        var batchNumberInput by remember { mutableStateOf("B-${(1000..9999).random()}") }
        var expiryDaysInput by remember { mutableStateOf("365") }
        var qtyInput by remember { mutableStateOf("10") }
        var purchasePriceInput by remember { mutableStateOf("5000") }
        var sellingPriceInput by remember { mutableStateOf("7000") }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Penerimaan Faktur Pembelian", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 460.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text("Pilih Supplier / PBF:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        allSuppliers.forEach { sup ->
                            Surface(
                                color = if (selectedSupplierId == sup.id) Emerald50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedSupplierId = sup.id }
                            ) {
                                Text(
                                    text = sup.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = if (selectedSupplierId == sup.id) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selectedSupplierId == sup.id) Emerald700 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = invoiceNumber,
                            onValueChange = { invoiceNumber = it },
                            label = { Text("Nomor Faktur Supplier") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        Divider()
                        Text("Tambah Item & Batch Obat:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    }

                    item {
                        Text("Pilih Obat:", style = MaterialTheme.typography.labelSmall)
                        allProducts.take(4).forEach { prod ->
                            Surface(
                                color = if (selectedProdId == prod.id) Teal50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedProdId = prod.id }
                            ) {
                                Text(
                                    text = prod.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = if (selectedProdId == prod.id) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selectedProdId == prod.id) Teal800 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }

                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(
                                value = batchNumberInput,
                                onValueChange = { batchNumberInput = it },
                                label = { Text("No. Batch") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = expiryDaysInput,
                                onValueChange = { expiryDaysInput = it },
                                label = { Text("Exp (+Hari)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(
                                value = qtyInput,
                                onValueChange = { qtyInput = it },
                                label = { Text("Jumlah") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = purchasePriceInput,
                                onValueChange = { purchasePriceInput = it },
                                label = { Text("Harga Beli (Rp)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = sellingPriceInput,
                                onValueChange = { sellingPriceInput = it },
                                label = { Text("Harga Jual (Rp)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                val prod = allProducts.find { it.id == selectedProdId }
                                val pUnits = productUnitsMap[selectedProdId] ?: emptyList()
                                val defaultUnit = pUnits.firstOrNull()
                                val uName = defaultUnit?.let { unitsMap[it.unitId]?.name } ?: "Unit"

                                if (prod != null && defaultUnit != null) {
                                    val days = expiryDaysInput.toLongOrNull() ?: 365L
                                    val expDate = System.currentTimeMillis() + (days * 86400000L)
                                    itemsInput = itemsInput + PurchaseItemData(
                                        productId = prod.id,
                                        productName = prod.name,
                                        productUnitId = defaultUnit.id,
                                        unitName = uName,
                                        batchNumber = batchNumberInput,
                                        expiredDate = expDate,
                                        qtyPurchase = qtyInput.toDoubleOrNull() ?: 1.0,
                                        conversionSnapshot = defaultUnit.conversionToBase,
                                        purchasePrice = purchasePriceInput.toDoubleOrNull() ?: 5000.0,
                                        sellingPrice = sellingPriceInput.toDoubleOrNull() ?: 7000.0
                                    )
                                    batchNumberInput = "B-${(1000..9999).random()}"
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Tambahkan Item Ini")
                        }
                    }

                    items(itemsInput) { item ->
                        Card(
                            shape = RoundedCornerShape(6.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate100),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.productName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                    Text("Batch: ${item.batchNumber} • ${item.qtyPurchase.toInt()} ${item.unitName} @ ${formatRupiah(item.purchasePrice)}", style = MaterialTheme.typography.labelSmall)
                                }
                                IconButton(onClick = { itemsInput = itemsInput - item }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Rose500)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val sup = allSuppliers.find { it.id == selectedSupplierId }
                        if (sup != null && itemsInput.isNotEmpty()) {
                            coroutineScope.launch {
                                repository.createPurchase(
                                    supplierId = sup.id,
                                    supplierName = sup.name,
                                    createdById = currentUser?.id ?: "u_manager",
                                    invoiceNumber = invoiceNumber.ifBlank { null },
                                    purchaseOrderId = null,
                                    taxMode = taxMode,
                                    discountAmount = 0.0,
                                    items = itemsInput
                                )
                                showCreateDialog = false
                            }
                        }
                    },
                    enabled = itemsInput.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) {
                    Text("Simpan & Tambah Stok")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) { Text("Batal") }
            }
        )
    }
}
