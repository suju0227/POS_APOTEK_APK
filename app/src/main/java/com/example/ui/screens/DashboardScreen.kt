package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.*
import com.example.data.repository.PharmacyRepository
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun DashboardScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val currentUser by repository.currentUser.collectAsState()
    val allSales by repository.allSales.collectAsState(initial = emptyList())
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allBatches by repository.allBatches.collectAsState(initial = emptyList())
    val readyPrescriptions by repository.readyPrescriptions.collectAsState(initial = emptyList())
    val appSettings by repository.appSettings.collectAsState(initial = null)

    val now = System.currentTimeMillis()
    val dayMillis = 86400000L

    // Date and time in Makassar (WITA) format
    val todayDateFormatted = remember {
        val sdf = SimpleDateFormat("EEEE, dd MMMM yyyy", Locale("id", "ID"))
        sdf.format(Date(now))
    }

    // Today's Sales Calculation
    val todaySales = remember(allSales) {
        allSales.filter { sale ->
            now - sale.createdAt < dayMillis
        }
    }
    val todayRevenue = remember(todaySales) { todaySales.sumOf { it.grandTotal } }
    val todayProfit = remember(todaySales) { todaySales.sumOf { it.totalProfit } }

    // Low stock calculation (stock <= minStockBase)
    val productStockMap = remember(allBatches) {
        allBatches.groupBy { it.productId }.mapValues { (_, batches) ->
            batches.sumOf { it.currentStockBase }
        }
    }
    val lowStockProducts = remember(allProducts, productStockMap) {
        allProducts.filter { prod ->
            val totalStock = productStockMap[prod.id] ?: 0.0
            totalStock <= prod.minStockBase
        }
    }

    // Near expired batches (< 90 days)
    val nearExpiryBatches = remember(allBatches) {
        allBatches.filter { batch ->
            val daysLeft = (batch.expiredDate - now) / dayMillis
            daysLeft in 0..90 && batch.currentStockBase > 0
        }.sortedBy { it.expiredDate }
    }

    val role = currentUser?.role ?: "KASIR"
    val isManagerOrOwner = role in listOf("MANAGER", "PEMILIK")

    Scaffold(
        topBar = {
            AppHeader(
                title = "Dashboard Apotek",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick,
                actions = {
                    IconButton(
                        onClick = { onNavigateTo(Screen.Login) },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.SwitchAccount,
                            contentDescription = "Ganti Akun",
                            tint = Color.White
                        )
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
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .widthIn(max = 860.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
            // 1. EXECUTIVE HERO BANNER
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        Teal800,
                                        Teal600,
                                        Emerald700
                                    )
                                )
                            )
                            .padding(20.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Top Row: Date & Active Status Pill
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.18f), RoundedCornerShape(20.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(7.dp)
                                            .clip(CircleShape)
                                            .background(Emerald500)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Apotek Online • FEFO Aktif",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }

                                Text(
                                    text = "WITA (Asia/Makassar)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Middle: Greeting & User Role Info
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(54.dp)
                                        .clip(CircleShape)
                                        .background(Color.White),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = when (role) {
                                            "MANAGER" -> Icons.Default.AdminPanelSettings
                                            "KASIR" -> Icons.Default.PointOfSale
                                            "APOTEKER" -> Icons.Default.MedicalServices
                                            "PEMILIK" -> Icons.Default.Assessment
                                            else -> Icons.Default.LocalPharmacy
                                        },
                                        contentDescription = null,
                                        tint = Teal700,
                                        modifier = Modifier.size(30.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Halo, ${currentUser?.name ?: "Pengguna"}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${appSettings?.pharmacyName ?: "Apotek Risyah"} • $todayDateFormatted",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Bottom Pill in Hero: Role Permission Notice
                            Surface(
                                color = Color.Black.copy(alpha = 0.18f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.VerifiedUser,
                                            contentDescription = null,
                                            tint = Emerald100,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Akses Aktif: $role",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Text(
                                        text = when (role) {
                                            "KASIR" -> "POS & Penjualan Struk"
                                            "APOTEKER" -> "Resep, Signa & Konseling"
                                            "MANAGER" -> "Kontrol Operasional Penuh"
                                            "PEMILIK" -> "Monitoring Omzet & Laba"
                                            else -> "Operasional Apotek"
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Emerald100
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 2. METRICS & KPI GRID
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Card 1: Omzet Penjualan
                        DashboardMetricCard(
                            title = "Omzet Hari Ini",
                            value = formatRupiah(todayRevenue),
                            caption = "${todaySales.size} Transaksi Selesai",
                            icon = Icons.Default.Payments,
                            iconBgColor = Emerald50,
                            iconTint = Emerald700,
                            modifier = Modifier.weight(1f),
                            onClick = {
                                if (role in listOf("KASIR", "MANAGER", "PEMILIK")) {
                                    onNavigateTo(Screen.SalesHistory)
                                }
                            }
                        )

                        // Card 2: Laba Kotor (Manager/Pemilik) ATAU Resep Siap Bayar (Kasir/Apoteker)
                        if (isManagerOrOwner) {
                            DashboardMetricCard(
                                title = "Laba Kotor Presisi",
                                value = formatRupiah(todayProfit),
                                caption = "Snapshot HPP FEFO",
                                icon = Icons.Default.TrendingUp,
                                iconBgColor = Teal50,
                                iconTint = Teal700,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Reports) }
                            )
                        } else {
                            DashboardMetricCard(
                                title = "Resep Siap Bayar",
                                value = "${readyPrescriptions.size} Resep",
                                caption = if (readyPrescriptions.isNotEmpty()) "Perlu Ditarik ke Kasir" else "Semua Selesai",
                                icon = Icons.Default.ReceiptLong,
                                iconBgColor = Indigo50,
                                iconTint = Indigo600,
                                badgeColor = if (readyPrescriptions.isNotEmpty()) Rose500 else null,
                                modifier = Modifier.weight(1f),
                                onClick = {
                                    if (role == "KASIR") onNavigateTo(Screen.Cashier)
                                    else onNavigateTo(Screen.Prescription)
                                }
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Card 3: Stok Kritis / Menipis
                        DashboardMetricCard(
                            title = "Stok Kritis",
                            value = "${lowStockProducts.size} Obat",
                            caption = if (lowStockProducts.isNotEmpty()) "Stok <= Min. Batas" else "Stok Aman",
                            icon = Icons.Default.WarningAmber,
                            iconBgColor = if (lowStockProducts.isNotEmpty()) Rose100 else Emerald50,
                            iconTint = if (lowStockProducts.isNotEmpty()) Rose500 else Emerald700,
                            modifier = Modifier.weight(1f),
                            onClick = {
                                if (role in listOf("MANAGER", "APOTEKER")) {
                                    onNavigateTo(Screen.Stock)
                                }
                            }
                        )

                        // Card 4: Mendekati Expired (< 90 Hari)
                        DashboardMetricCard(
                            title = "Exp < 90 Hari",
                            value = "${nearExpiryBatches.size} Batch",
                            caption = "Prioritas Keluar FEFO",
                            icon = Icons.Default.HourglassBottom,
                            iconBgColor = if (nearExpiryBatches.isNotEmpty()) Amber100 else Emerald50,
                            iconTint = if (nearExpiryBatches.isNotEmpty()) Amber700 else Emerald700,
                            modifier = Modifier.weight(1f),
                            onClick = {
                                if (role in listOf("MANAGER", "APOTEKER")) {
                                    onNavigateTo(Screen.Stock)
                                }
                            }
                        )
                    }
                }
            }

            // 3. PRIORITY ALERT: RESEP SIAP BAYAR (JIKA ADA)
            if (readyPrescriptions.isNotEmpty() && role in listOf("KASIR", "MANAGER")) {
                item {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Indigo50),
                        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Indigo500, Teal600))),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(34.dp)
                                            .clip(CircleShape)
                                            .background(Indigo500),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.MedicalServices,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = "Ada ${readyPrescriptions.size} Resep Siap Ditransaksikan!",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Indigo600
                                        )
                                        Text(
                                            text = "Telah divalidasi oleh Apoteker dengan instruksi Signa.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Slate600
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Button(
                                onClick = { onNavigateTo(Screen.Cashier) },
                                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                                contentPadding = PaddingValues(vertical = 10.dp)
                            ) {
                                Icon(Icons.Default.PointOfSale, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Buka Kasir & Tarik Resep", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // 4. QUICK ACTION GRID (AKSI CEPAT OPERASIONAL)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Aksi Cepat Menu",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Slate800
                    )
                    Text(
                        text = "Akses Cepat",
                        style = MaterialTheme.typography.labelSmall,
                        color = Slate500
                    )
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Kasir Row
                    if (role in listOf("KASIR", "MANAGER")) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ActionMenuCard(
                                title = "Kasir & POS",
                                subtitle = "Penjualan langsung & resep",
                                icon = Icons.Default.PointOfSale,
                                accentColor = Teal600,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Cashier) }
                            )
                            ActionMenuCard(
                                title = "Riwayat Struk",
                                subtitle = "Daftar struk & retur jual",
                                icon = Icons.Default.ReceiptLong,
                                accentColor = Emerald600,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.SalesHistory) }
                            )
                        }
                    }

                    // Apoteker Row
                    if (role in listOf("APOTEKER", "MANAGER")) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ActionMenuCard(
                                title = "Pelayanan Resep",
                                subtitle = "Input resep & signa dokter",
                                icon = Icons.Default.MedicalServices,
                                accentColor = Indigo600,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Prescription) }
                            )
                            ActionMenuCard(
                                title = "Konseling Obat",
                                subtitle = "Catatan KIO & edukasi",
                                icon = Icons.Default.VolunteerActivism,
                                accentColor = Cyan600,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Counseling) }
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ActionMenuCard(
                                title = "Pemesanan (PO)",
                                subtitle = "Draft pesanan distributor",
                                icon = Icons.Default.Description,
                                accentColor = Violet600,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.PurchaseOrder) }
                            )
                            ActionMenuCard(
                                title = "Stok & FEFO",
                                subtitle = "Monitor batch obat & exp",
                                icon = Icons.Default.Inventory2,
                                accentColor = Amber700,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Stock) }
                            )
                        }
                    }

                    // Manager Only Row
                    if (role == "MANAGER") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ActionMenuCard(
                                title = "Faktur Pembelian",
                                subtitle = "Input barang masuk & HPP",
                                icon = Icons.Default.LocalShipping,
                                accentColor = Emerald700,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Purchase) }
                            )
                            ActionMenuCard(
                                title = "Laporan & Laba",
                                subtitle = "HPP, omzet & margin laba",
                                icon = Icons.Default.BarChart,
                                accentColor = Teal700,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigateTo(Screen.Reports) }
                            )
                        }
                    }

                    // Pemilik Only Row
                    if (role == "PEMILIK") {
                        ActionMenuCard(
                            title = "Laporan Penjualan & Laba Bersih",
                            subtitle = "Pantau omzet, laba kotor, dan margin bisnis apotek",
                            icon = Icons.Default.Assessment,
                            accentColor = Teal700,
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onNavigateTo(Screen.Reports) }
                        )
                    }
                }
            }

            // 5. BATCH EXPIRY RADAR (< 90 Hari Prioritas FEFO)
            if (nearExpiryBatches.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Amber500)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Prioritas FEFO: Batch Mendekati Expired",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Slate800
                            )
                        }

                        if (role in listOf("MANAGER", "APOTEKER")) {
                            TextButton(
                                onClick = { onNavigateTo(Screen.Stock) },
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text("Semua Batch", color = Teal600, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                items(nearExpiryBatches.take(4)) { batch ->
                    val prod = allProducts.find { it.id == batch.productId }
                    val daysLeft = ((batch.expiredDate - now) / dayMillis).toInt()

                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Amber100, Slate200))),
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
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(if (daysLeft <= 30) Rose100 else Amber100),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.EventBusy,
                                    contentDescription = null,
                                    tint = if (daysLeft <= 30) Rose500 else Amber700,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = prod?.name ?: "Obat ID: ${batch.productId}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate800
                                )
                                Text(
                                    text = "No. Batch: ${batch.batchNumber} • Exp: ${formatDate(batch.expiredDate)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                StatusBadge(
                                    text = if (daysLeft <= 0) "EXPIRED" else "$daysLeft Hari Lagi",
                                    containerColor = if (daysLeft <= 30) Rose100 else Amber100,
                                    contentColor = if (daysLeft <= 30) Rose500 else Amber700
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Sisa: ${batch.currentStockBase.toInt()} unit",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate700
                                )
                            }
                        }
                    }
                }
            }

            // 6. RECENT TRANSACTIONS FEED
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Transaksi Kasir Terbaru",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Slate800
                    )
                    if (role in listOf("KASIR", "MANAGER", "PEMILIK")) {
                        TextButton(
                            onClick = { onNavigateTo(Screen.SalesHistory) },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("Lihat Riwayat", color = Teal600, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            if (allSales.isEmpty()) {
                item {
                    EmptyStateView(
                        title = "Belum Ada Transaksi",
                        description = "Transaksi penjualan kasir akan otomatis muncul di sini.",
                        icon = Icons.Default.ReceiptLong
                    )
                }
            } else {
                items(allSales.take(5)) { sale ->
                    Card(
                        shape = RoundedCornerShape(12.dp),
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
                                    .size(42.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Teal50),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = when (sale.paymentMethod) {
                                        "QRIS" -> Icons.Default.QrCode
                                        "TRANSFER" -> Icons.Default.AccountBalance
                                        else -> Icons.Default.Receipt
                                    },
                                    contentDescription = null,
                                    tint = Teal700,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = sale.saleNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate800
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    StatusBadge(
                                        text = sale.paymentMethod,
                                        containerColor = when (sale.paymentMethod) {
                                            "QRIS" -> Cyan50
                                            "TRANSFER" -> Indigo50
                                            else -> Emerald50
                                        },
                                        contentColor = when (sale.paymentMethod) {
                                            "QRIS" -> Cyan700
                                            "TRANSFER" -> Indigo600
                                            else -> Emerald700
                                        }
                                    )
                                }
                                Text(
                                    text = "${formatDateTime(sale.createdAt)} • Kasir: ${sale.cashierName}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }

                            Text(
                                text = formatRupiah(sale.grandTotal),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = Emerald700
                            )
                        }
                    }
                }
            }

            // 7. FOOTER SYSTEM INFO
            item {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(12.dp),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .padding(14.dp)
                            .fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocalPharmacy,
                                contentDescription = null,
                                tint = Teal600,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = appSettings?.pharmacyName ?: "Apotek Risyah",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate800
                                )
                                Text(
                                    text = "POS Apotek V2 • Database Offline-First",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Slate500
                                )
                            }
                        }

                        Text(
                            text = "v2.0-native",
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate400,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}
}

// -----------------------------------------------------------------------------
// HELPER COMPOSABLES FOR DASHBOARD
// -----------------------------------------------------------------------------

@Composable
fun DashboardMetricCard(
    title: String,
    value: String,
    caption: String,
    icon: ImageVector,
    iconBgColor: Color,
    iconTint: Color,
    badgeColor: Color? = null,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Slate200, Slate100))),
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) {
                    Modifier.bounceClick(onClick = onClick)
                } else {
                    Modifier
                }
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(iconBgColor),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(22.dp)
                    )
                }

                if (badgeColor != null) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(badgeColor)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = Slate500,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold,
                color = Slate900,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = caption,
                style = MaterialTheme.typography.labelSmall,
                color = Slate400,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun ActionMenuCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Slate200, Slate100))),
        modifier = modifier
            .fillMaxWidth()
            .bounceClick(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(accentColor.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Slate800
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = Slate500,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                tint = Slate300,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}
