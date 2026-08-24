package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.*
import com.example.data.repository.PharmacyRepository
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SalesHistoryScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allSales by repository.allSales.collectAsState(initial = emptyList())
    var searchQuery by remember { mutableStateOf("") }
    var selectedSale by remember { mutableStateOf<SaleEntity?>(null) }
    var saleItems by remember { mutableStateOf<List<SaleItemEntity>>(emptyList()) }
    var saleAllocations by remember { mutableStateOf<Map<String, List<SaleBatchAllocationEntity>>>(emptyMap()) }
    var showDetailDialog by remember { mutableStateOf(false) }

    // Sales Return Dialog State
    var showReturnDialog by remember { mutableStateOf(false) }
    var returnReason by remember { mutableStateOf("Obat salah beli / rusak") }
    var returnQuantities by remember { mutableStateOf<Map<String, Double>>(emptyMap()) }
    var isSubmittingReturn by remember { mutableStateOf(false) }
    var returnError by remember { mutableStateOf<String?>(null) }

    val filteredSales = remember(allSales, searchQuery) {
        if (searchQuery.isBlank()) allSales
        else allSales.filter {
            it.saleNumber.contains(searchQuery, ignoreCase = true) ||
            it.cashierName.contains(searchQuery, ignoreCase = true) ||
            it.paymentMethod.contains(searchQuery, ignoreCase = true)
        }
    }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Riwayat Transaksi Penjualan",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50),
            contentAlignment = Alignment.TopCenter
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .widthIn(max = 860.dp)
            ) {
                Surface(
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Cari nomor struk TRX, kasir...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Teal600) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                    )
                }

                if (filteredSales.isEmpty()) {
                    EmptyStateView(
                        title = "Tidak Ada Data Transaksi",
                        description = "Riwayat penjualan kasir akan tercatat di sini.",
                        icon = Icons.Default.History
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredSales) { sale ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .bounceClick {
                                        selectedSale = sale
                                        coroutineScope.launch {
                                            val (items, allocs) = repository.getSaleDetails(sale.id)
                                            saleItems = items
                                            saleAllocations = allocs
                                            showDetailDialog = true
                                        }
                                    }
                            ) {
                            Row(
                                modifier = Modifier
                                    .padding(14.dp)
                                    .fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(Teal50),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Receipt, contentDescription = null, tint = Teal600, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = sale.saleNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate800
                                    )
                                    Text(
                                        text = "${formatDateTime(sale.createdAt)} • Kasir: ${sale.cashierName}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate500
                                    )
                                    Row(
                                        modifier = Modifier.padding(top = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        StatusBadge(
                                            text = sale.paymentMethod,
                                            containerColor = if (sale.paymentMethod == "CASH") Emerald50 else Indigo100,
                                            contentColor = if (sale.paymentMethod == "CASH") Emerald700 else Indigo500
                                        )
                                        if (currentUser?.role == "MANAGER" || currentUser?.role == "PEMILIK") {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Laba: ${formatRupiah(sale.totalProfit)}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Slate500
                                            )
                                        }
                                    }
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = formatRupiah(sale.grandTotal),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald700
                                    )
                                    Text(
                                        text = "Bayar: ${formatRupiah(sale.paidAmount)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Slate400
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Detail Dialog
    if (showDetailDialog && selectedSale != null) {
        val sale = selectedSale!!
        AlertDialog(
            onDismissRequest = { showDetailDialog = false },
            title = {
                Text(text = "Rincian Transaksi ${sale.saleNumber}", fontWeight = FontWeight.Bold)
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text("Waktu: ${formatDateTime(sale.createdAt)}", style = MaterialTheme.typography.bodySmall)
                            Text("Kasir: ${sale.cashierName}", style = MaterialTheme.typography.bodySmall)
                            Text("Metode: ${sale.paymentMethod}", style = MaterialTheme.typography.bodySmall)
                            Divider(modifier = Modifier.padding(vertical = 6.dp))
                            Text("Daftar Item & Alokasi FEFO Batch:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    items(saleItems) { item ->
                        val allocs = saleAllocations[item.id] ?: emptyList()
                        Card(
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate50),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(item.productName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                    Text(formatRupiah(item.totalAfterDiscount), fontWeight = FontWeight.Bold, color = Emerald700)
                                }
                                Text(
                                    text = "${item.qtySale.toInt()} ${item.unitName} @ ${formatRupiah(item.sellingPrice)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate600
                                )

                                // Batch allocations
                                allocs.forEach { alloc ->
                                    Surface(
                                        color = Color.White,
                                        shape = RoundedCornerShape(4.dp),
                                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(6.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "Batch: ${alloc.batchNumber} (Exp: ${formatDate(alloc.expiredDate)})",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Slate700
                                            )
                                            Text(
                                                text = "Keluar: ${alloc.qtyBase.toInt()} unit dasar",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Teal700
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Divider(modifier = Modifier.padding(vertical = 6.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal:", style = MaterialTheme.typography.bodyMedium)
                            Text(formatRupiah(sale.subtotal))
                        }
                        if (sale.discountTotal > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Diskon:", style = MaterialTheme.typography.bodyMedium)
                                Text("- ${formatRupiah(sale.discountTotal)}", color = Rose500)
                            }
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Grand Total:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Text(formatRupiah(sale.grandTotal), fontWeight = FontWeight.Bold, color = Emerald700)
                        }
                        if (currentUser?.role == "MANAGER" || currentUser?.role == "PEMILIK") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Laba Bersih:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                Text(formatRupiah(sale.totalProfit), fontWeight = FontWeight.Bold, color = Teal700)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (currentUser?.role in listOf("KASIR", "MANAGER")) {
                    Button(
                        onClick = {
                            // Init return map
                            val initialReturns = mutableMapOf<String, Double>()
                            saleAllocations.values.flatten().forEach { alloc ->
                                initialReturns[alloc.id] = (alloc.qtyBase - alloc.returnedQtyBase).coerceAtLeast(0.0)
                            }
                            returnQuantities = initialReturns
                            showDetailDialog = false
                            showReturnDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Rose500)
                    ) {
                        Text("Retur Transaksi")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDetailDialog = false }) {
                    Text("Tutup")
                }
            }
        )
    }

    // Sales Return Confirmation Dialog
    if (showReturnDialog && selectedSale != null) {
        val sale = selectedSale!!
        AlertDialog(
            onDismissRequest = { if (!isSubmittingReturn) showReturnDialog = false },
            title = {
                Text("Proses Retur Penjualan", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Transaksi: ${sale.saleNumber}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = returnReason,
                        onValueChange = { returnReason = it },
                        label = { Text("Alasan Retur") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Pilih Jumlah Satuan Dasar yang Diretur:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)

                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 240.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        val allAllocations = saleAllocations.values.flatten()
                        items(allAllocations) { alloc ->
                            val maxReturnable = alloc.qtyBase - alloc.returnedQtyBase
                            val currentRet = returnQuantities[alloc.id] ?: 0.0

                            Card(
                                shape = RoundedCornerShape(6.dp),
                                colors = CardDefaults.cardColors(containerColor = Slate50),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Batch: ${alloc.batchNumber}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                        Text("Maks Retur: ${maxReturnable.toInt()} unit", style = MaterialTheme.typography.labelSmall, color = Slate500)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(
                                            onClick = {
                                                if (currentRet > 0) {
                                                    returnQuantities = returnQuantities + (alloc.id to (currentRet - 1))
                                                }
                                            },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Kurang")
                                        }
                                        Text("${currentRet.toInt()}", modifier = Modifier.padding(horizontal = 4.dp), fontWeight = FontWeight.Bold)
                                        IconButton(
                                            onClick = {
                                                if (currentRet < maxReturnable) {
                                                    returnQuantities = returnQuantities + (alloc.id to (currentRet + 1))
                                                }
                                            },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(Icons.Default.AddCircleOutline, contentDescription = "Tambah")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (returnError != null) {
                        Text(returnError ?: "", color = Rose500, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isSubmittingReturn = true
                        returnError = null
                        coroutineScope.launch {
                            val allAllocations = saleAllocations.values.flatten()
                            val returnList = allAllocations.mapNotNull { alloc ->
                                val qty = returnQuantities[alloc.id] ?: 0.0
                                if (qty > 0) alloc to qty else null
                            }
                            if (returnList.isEmpty()) {
                                returnError = "Pilih minimal 1 item untuk diretur"
                                isSubmittingReturn = false
                                return@launch
                            }
                            val result = repository.processSalesReturn(
                                saleId = sale.id,
                                cashierId = currentUser?.id ?: "u_kasir",
                                reason = returnReason,
                                returns = returnList
                            )
                            isSubmittingReturn = false
                            result.onSuccess {
                                showReturnDialog = false
                            }.onFailure {
                                returnError = it.message ?: "Gagal memproses retur"
                            }
                        }
                    },
                    enabled = !isSubmittingReturn,
                    colors = ButtonDefaults.buttonColors(containerColor = Rose500)
                ) {
                    if (isSubmittingReturn) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    else Text("Simpan Retur")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReturnDialog = false }, enabled = !isSubmittingReturn) {
                    Text("Batal")
                }
            }
        )
    }
}
