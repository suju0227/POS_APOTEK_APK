package com.example.ui.screens

import androidx.compose.foundation.background
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
import com.example.data.repository.PharmacyRepository
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*

@Composable
fun ReportsScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val currentUser by repository.currentUser.collectAsState()
    val allSales by repository.allSales.collectAsState(initial = emptyList())
    val allReturns by repository.allSalesReturns.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) }
    var showExportDialog by remember { mutableStateOf(false) }

    val totalRevenue = remember(allSales) { allSales.sumOf { it.grandTotal } }
    val totalHpp = remember(allSales) { allSales.sumOf { it.totalHpp } }
    val totalGrossProfit = remember(allSales) { allSales.sumOf { it.totalProfit } }
    val totalReturnRefund = remember(allReturns) { allReturns.sumOf { it.totalRefund } }
    val totalReturnProfitRev = remember(allReturns) { allReturns.sumOf { it.totalProfitReversed } }
    val netProfit = (totalGrossProfit - totalReturnProfitRev).coerceAtLeast(0.0)
    val marginPercentage = if (totalRevenue > 0) (netProfit / totalRevenue) * 100 else 0.0

    Scaffold(
        topBar = {
            AppHeader(
                title = "Laporan Penjualan & Laba",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick,
                actions = {
                    IconButton(
                        onClick = { showExportDialog = true },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Ekspor Laporan", tint = Color.White)
                    }
                }
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
                    text = { Text("Laporan Penjualan", fontWeight = FontWeight.Bold) }
                )
                if (currentUser?.role in listOf("MANAGER", "PEMILIK")) {
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Laba & HPP Presisi", fontWeight = FontWeight.Bold) }
                    )
                }
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("Laporan Retur (${allReturns.size})", fontWeight = FontWeight.Bold) }
                )
            }

            when (selectedTab) {
                0 -> {
                    // Sales Report
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            SummaryStatCard(
                                title = "Total Omzet Penjualan",
                                value = formatRupiah(totalRevenue),
                                subtitle = "Dari ${allSales.size} transaksi selesai",
                                icon = Icons.Default.MonetizationOn,
                                iconBgColor = Emerald100,
                                iconTint = Emerald700
                            )
                        }

                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                SummaryStatCard(
                                    title = "Total Transaksi",
                                    value = "${allSales.size}",
                                    subtitle = "Struk Kasir",
                                    icon = Icons.Default.ReceiptLong,
                                    iconBgColor = Indigo100,
                                    iconTint = Indigo500,
                                    modifier = Modifier.weight(1f)
                                )
                                val avgTrx = if (allSales.isNotEmpty()) totalRevenue / allSales.size else 0.0
                                SummaryStatCard(
                                    title = "Rata-Rata Keranjang",
                                    value = formatRupiah(avgTrx),
                                    subtitle = "Per Struk",
                                    icon = Icons.Default.ShoppingCart,
                                    iconBgColor = Teal100,
                                    iconTint = Teal700,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        item {
                            Text(
                                text = "Daftar Transaksi:",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Slate800
                            )
                        }

                        items(allSales) { sale ->
                            Card(
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(sale.saleNumber, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                        Text("${formatDateTime(sale.createdAt)} • ${sale.cashierName}", style = MaterialTheme.typography.bodySmall, color = Slate500)
                                    }
                                    Text(formatRupiah(sale.grandTotal), fontWeight = FontWeight.Bold, color = Emerald700)
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // Profit & HPP Report (Manager & Pemilik Only)
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Teal700),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Text("Laba Bersih Apotek (Net Profit):", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.85f))
                                    Text(
                                        text = formatRupiah(netProfit),
                                        style = MaterialTheme.typography.headlineLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "Margin Keuntungan Bersih: ${String.format("%.2f", marginPercentage)}%",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Emerald100,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }
                            }
                        }

                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                SummaryStatCard(
                                    title = "Total HPP Modal",
                                    value = formatRupiah(totalHpp),
                                    subtitle = "Snapshot Batch FEFO",
                                    icon = Icons.Default.AccountBalanceWallet,
                                    iconBgColor = Amber100,
                                    iconTint = Amber700,
                                    modifier = Modifier.weight(1f)
                                )
                                SummaryStatCard(
                                    title = "Total Omzet",
                                    value = formatRupiah(totalRevenue),
                                    subtitle = "Penjualan Kasir",
                                    icon = Icons.Default.Payments,
                                    iconBgColor = Emerald100,
                                    iconTint = Emerald700,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Ringkasan Neraca Transaksi:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                    Divider()
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Total Pendapatan Kotor (Gross):")
                                        Text(formatRupiah(totalRevenue), fontWeight = FontWeight.SemiBold)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Total HPP Modal Terjual:")
                                        Text("- ${formatRupiah(totalHpp)}", color = Rose500)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Pengurangan Retur Penjualan:")
                                        Text("- ${formatRupiah(totalReturnProfitRev)}", color = Rose500)
                                    }
                                    Divider()
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Laba Bersih Akhir:", fontWeight = FontWeight.Bold)
                                        Text(formatRupiah(netProfit), fontWeight = FontWeight.Bold, color = Emerald700)
                                    }
                                }
                            }
                        }
                    }
                }
                2 -> {
                    // Returns Report
                    if (allReturns.isEmpty()) {
                        EmptyStateView(
                            title = "Belum Ada Retur Penjualan",
                            description = "Data retur barang yang dikembalikan pelanggan akan muncul di sini.",
                            icon = Icons.Default.AssignmentReturn
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            item {
                                SummaryStatCard(
                                    title = "Total Pengembalian Dana (Refund)",
                                    value = formatRupiah(totalReturnRefund),
                                    subtitle = "Dari ${allReturns.size} transaksi retur",
                                    icon = Icons.Default.AssignmentReturn,
                                    iconBgColor = Rose100,
                                    iconTint = Rose500
                                )
                            }

                            items(allReturns) { ret ->
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(ret.returnNumber, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                            Text("Ref: ${ret.saleNumber} • ${formatDateTime(ret.createdAt)}", style = MaterialTheme.typography.bodySmall, color = Slate500)
                                            Text("Alasan: ${ret.reason}", style = MaterialTheme.typography.labelSmall, color = Slate600)
                                        }
                                        Text(
                                            text = formatRupiah(ret.totalRefund),
                                            fontWeight = FontWeight.Bold,
                                            color = Rose500
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

if (showExportDialog) {
        AlertDialog(
            onDismissRequest = { showExportDialog = false },
            title = { Text("Ekspor Laporan Penjualan & Laba", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Format file: CSV / Spreadsheet Compatible", style = MaterialTheme.typography.bodySmall)
                    Surface(
                        color = Slate100,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Laporan_Apotek_Risyah_${System.currentTimeMillis()}.csv\n• ${allSales.size} Transaksi Penjualan\n• ${allReturns.size} Retur\n• Total Omzet: ${formatRupiah(totalRevenue)}\n• Laba Bersih: ${formatRupiah(netProfit)}",
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showExportDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Text("Unduh File CSV")
                }
            },
            dismissButton = {
                TextButton(onClick = { showExportDialog = false }) { Text("Tutup") }
            }
        )
    }
}
