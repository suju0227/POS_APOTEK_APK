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
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun StockScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allBatches by repository.allBatches.collectAsState(initial = emptyList())
    val allMutations by repository.allStockMutations.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    // Stock Opname Dialog
    var selectedBatchForOpname by remember { mutableStateOf<ProductBatchEntity?>(null) }
    var newQtyInput by remember { mutableStateOf("") }
    var opnameReason by remember { mutableStateOf("Penyesuaian Fisik Stok Opname") }
    var showOpnameDialog by remember { mutableStateOf(false) }

    val productsMap = remember(allProducts) { allProducts.associateBy { it.id } }
    val now = System.currentTimeMillis()
    val dayMillis = 86400000L

    Scaffold(
        topBar = {
            AppHeader(
                title = "Stok Obat & Mutasi",
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
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = Teal600
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Stok Per Batch (FEFO)", fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.Inventory, contentDescription = null) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Kartu Mutasi Stok", fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.Timeline, contentDescription = null) }
                    )
                }

                // Search Bar
                Surface(
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text(if (selectedTab == 0) "Cari obat, no. batch..." else "Cari mutasi produk, alasan...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Teal600) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                    )
                }

            if (selectedTab == 0) {
                // Stock Per Batch List
                val sortedBatches = remember(allBatches, searchQuery) {
                    allBatches.filter {
                        val prod = productsMap[it.productId]
                        searchQuery.isBlank() ||
                                it.batchNumber.contains(searchQuery, ignoreCase = true) ||
                                (prod?.name?.contains(searchQuery, ignoreCase = true) == true)
                    }.sortedBy { it.expiredDate }
                }

                if (sortedBatches.isEmpty()) {
                    EmptyStateView(
                        title = "Tidak Ada Data Batch",
                        description = "Batch obat akan tercatat setelah penerimaan faktur pembelian.",
                        icon = Icons.Default.Inventory2
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(sortedBatches) { batch ->
                            val prod = productsMap[batch.productId]
                            val daysLeft = ((batch.expiredDate - now) / dayMillis).toInt()
                            val isExpired = daysLeft <= 0
                            val isNearExpiry = daysLeft in 1..90

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
                                            .size(44.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isExpired -> Rose100
                                                    isNearExpiry -> Amber100
                                                    else -> Teal50
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Medication,
                                            contentDescription = null,
                                            tint = when {
                                                isExpired -> Rose500
                                                isNearExpiry -> Amber500
                                                else -> Teal600
                                            },
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = prod?.name ?: "Produk ID: ${batch.productId}",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Slate800
                                        )
                                        Text(
                                            text = "Batch: ${batch.batchNumber} • Exp: ${formatDate(batch.expiredDate)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Slate600
                                        )
                                        Row(
                                            modifier = Modifier.padding(top = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            StatusBadge(
                                                text = when {
                                                    isExpired -> "EXPIRED"
                                                    isNearExpiry -> "Exp $daysLeft Hari"
                                                    else -> "Aman ($daysLeft Hari)"
                                                },
                                                containerColor = when {
                                                    isExpired -> Rose100
                                                    isNearExpiry -> Amber100
                                                    else -> Emerald50
                                                },
                                                contentColor = when {
                                                    isExpired -> Rose500
                                                    isNearExpiry -> Amber500
                                                    else -> Emerald700
                                                }
                                            )
                                            if (currentUser?.role == "MANAGER") {
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "HPP: ${formatRupiah(batch.hppBase)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Slate500
                                                )
                                            }
                                        }
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            text = "${batch.currentStockBase.toInt()} unit",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = if (batch.currentStockBase > 0) Emerald700 else Rose500
                                        )
                                        if (currentUser?.role == "MANAGER") {
                                            TextButton(
                                                onClick = {
                                                    selectedBatchForOpname = batch
                                                    newQtyInput = batch.currentStockBase.toInt().toString()
                                                    showOpnameDialog = true
                                                },
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("Opname", style = MaterialTheme.typography.labelSmall, color = Teal600)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Kartu Mutasi Stok Audit Trail
                val filteredMutations = remember(allMutations, searchQuery) {
                    if (searchQuery.isBlank()) allMutations
                    else allMutations.filter {
                        it.productName.contains(searchQuery, ignoreCase = true) ||
                                it.batchNumber.contains(searchQuery, ignoreCase = true) ||
                                (it.reason?.contains(searchQuery, ignoreCase = true) == true)
                    }
                }

                if (filteredMutations.isEmpty()) {
                    EmptyStateView(
                        title = "Belum Ada Mutasi Stok",
                        description = "Semua pergerakan keluar/masuk obat otomatis tercatat di sini.",
                        icon = Icons.Default.Timeline
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredMutations) { mut ->
                            Card(
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .padding(12.dp)
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (mut.qtyChange >= 0) Emerald50 else Rose100
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = if (mut.qtyChange >= 0) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                                            contentDescription = null,
                                            tint = if (mut.qtyChange >= 0) Emerald700 else Rose500,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = mut.productName,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Slate800
                                        )
                                        Text(
                                            text = "Batch: ${mut.batchNumber} • ${mut.reason ?: mut.mutationType}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Slate600
                                        )
                                        Text(
                                            text = "${formatDateTime(mut.createdAt)} • Stok: ${mut.qtyBefore.toInt()} -> ${mut.qtyAfter.toInt()}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Slate400
                                        )
                                    }
                                    Text(
                                        text = if (mut.qtyChange >= 0) "+${mut.qtyChange.toInt()}" else "${mut.qtyChange.toInt()}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = if (mut.qtyChange >= 0) Emerald700 else Rose500
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Stock Opname Adjustment Dialog
    if (showOpnameDialog && selectedBatchForOpname != null) {
        val batch = selectedBatchForOpname!!
        AlertDialog(
            onDismissRequest = { showOpnameDialog = false },
            title = { Text("Koreksi Stok Opname Fisik", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Batch: ${batch.batchNumber}", fontWeight = FontWeight.Bold)
                    Text("Stok Sistem Saat Ini: ${batch.currentStockBase.toInt()} unit dasar", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = newQtyInput,
                        onValueChange = { newQtyInput = it },
                        label = { Text("Stok Fisik Sebenarnya") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = opnameReason,
                        onValueChange = { opnameReason = it },
                        label = { Text("Alasan Selisih Fisik") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val newQty = newQtyInput.toDoubleOrNull()
                        if (newQty != null) {
                            coroutineScope.launch {
                                repository.adjustStock(
                                    batchId = batch.id,
                                    newQty = newQty,
                                    reason = opnameReason,
                                    createdById = currentUser?.id ?: "u_manager"
                                )
                                showOpnameDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Text("Simpan Koreksi")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOpnameDialog = false }) { Text("Batal") }
            }
        )
    }
}
