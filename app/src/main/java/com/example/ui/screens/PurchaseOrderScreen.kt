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
fun PurchaseOrderScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allPOs by repository.allPurchaseOrders.collectAsState(initial = emptyList())
    val allSuppliers by repository.allSuppliers.collectAsState(initial = emptyList())
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allProductUnits by repository.allProductUnits.collectAsState(initial = emptyList())

    var showCreateDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Surat Pemesanan Obat (PO)",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick
            )
        },
        floatingActionButton = {
            if (currentUser?.role in listOf("APOTEKER", "MANAGER")) {
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Teal600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Buat PO Baru")
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
            if (allPOs.isEmpty()) {
                EmptyStateView(
                    title = "Belum Ada Surat Pemesanan",
                    description = "Buat Surat Pesanan (PO) untuk pengadaan obat ke PBF / Distributor.",
                    icon = Icons.Default.Description
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(allPOs) { po ->
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
                                        .background(Teal50),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Description, contentDescription = null, tint = Teal600, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = po.poNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate800
                                    )
                                    Text(
                                        text = "Distributor: ${po.supplierName}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Slate700
                                    )
                                    Text(
                                        text = "Tgl: ${formatDate(po.orderDate)} • Catatan: ${po.note ?: "-"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate500
                                    )
                                }
                                StatusBadge(
                                    text = when (po.status) {
                                        "RECEIVED" -> "Diterima"
                                        "SUBMITTED" -> "Terkirim"
                                        else -> "Draft"
                                    },
                                    containerColor = if (po.status == "RECEIVED") Emerald100 else Amber100,
                                    contentColor = if (po.status == "RECEIVED") Emerald700 else Amber500
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        var selectedSupId by remember { mutableStateOf(allSuppliers.firstOrNull()?.id ?: "") }
        var note by remember { mutableStateOf("") }
        var selectedProdId by remember { mutableStateOf(allProducts.firstOrNull()?.id ?: "") }
        var qtyInput by remember { mutableStateOf("10") }
        var poItems by remember { mutableStateOf<List<Pair<ProductEntity, Pair<ProductUnitEntity, Double>>>>(emptyList()) }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Buat Surat Pesanan (PO)", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text("Pilih Distributor PBF:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        allSuppliers.forEach { sup ->
                            Surface(
                                color = if (selectedSupId == sup.id) Teal50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedSupId = sup.id }
                            ) {
                                Text(
                                    text = sup.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (selectedSupId == sup.id) Teal800 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = note,
                            onValueChange = { note = it },
                            label = { Text("Catatan / Keterangan PO") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        Divider()
                        Text("Pilih Obat yang Dipesan:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                        allProducts.take(4).forEach { prod ->
                            Surface(
                                color = if (selectedProdId == prod.id) Emerald50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedProdId = prod.id }
                            ) {
                                Text(
                                    text = prod.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (selectedProdId == prod.id) Emerald700 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                val prod = allProducts.find { it.id == selectedProdId }
                                val pUnit = allProductUnits.find { it.productId == selectedProdId }
                                if (prod != null && pUnit != null) {
                                    poItems = poItems + (prod to (pUnit to (qtyInput.toDoubleOrNull() ?: 10.0)))
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Tambahkan ke PO")
                        }
                    }

                    items(poItems) { (prod, unitQty) ->
                        val (_, qty) = unitQty
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
                                Text("${prod.name} (${qty.toInt()} unit)", style = MaterialTheme.typography.bodySmall)
                                IconButton(onClick = { poItems = poItems.filter { it != (prod to unitQty) } }) {
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
                        val sup = allSuppliers.find { it.id == selectedSupId }
                        if (sup != null && poItems.isNotEmpty()) {
                            coroutineScope.launch {
                                repository.createPurchaseOrder(
                                    supplierId = sup.id,
                                    supplierName = sup.name,
                                    createdById = currentUser?.id ?: "u_manager",
                                    note = note.ifBlank { null },
                                    items = poItems
                                )
                                showCreateDialog = false
                            }
                        }
                    },
                    enabled = poItems.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Text("Simpan Surat Pesanan")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) { Text("Batal") }
            }
        )
    }
}
