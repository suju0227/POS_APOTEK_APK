package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.model.*
import com.example.data.repository.CartItem
import com.example.data.repository.PharmacyRepository
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CashierScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val keyboardController = LocalSoftwareKeyboardController.current

    val currentUser by repository.currentUser.collectAsState()
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allProductUnits by repository.allProductUnits.collectAsState(initial = emptyList())
    val allBatches by repository.allBatches.collectAsState(initial = emptyList())
    val allBatchPrices by repository.allBatchPrices.collectAsState(initial = emptyList())
    val allUnits by repository.allUnits.collectAsState(initial = emptyList())
    val allCategories by repository.allCategories.collectAsState(initial = emptyList())
    val readyPrescriptions by repository.readyPrescriptions.collectAsState(initial = emptyList())
    val appSettings by repository.appSettings.collectAsState(initial = null)

    // UI state
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }
    var currentTab by remember { mutableIntStateOf(0) } // 0: Katalog Obat, 1: Keranjang
    var cartItems by remember { mutableStateOf<List<CartItem>>(emptyList()) }
    var selectedPrescription by remember { mutableStateOf<PrescriptionEntity?>(null) }
    var customerName by remember { mutableStateOf("Pelanggan Umum") }

    // Dialog states
    var showPaymentDialog by remember { mutableStateOf(false) }
    var showPrescriptionPicker by remember { mutableStateOf(false) }
    var completedSale by remember { mutableStateOf<SaleEntity?>(null) }
    var showReceiptDialog by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isCheckingOut by remember { mutableStateOf(false) }

    // Mappings
    val unitsMap = remember(allUnits) { allUnits.associateBy { it.id } }
    val categoriesMap = remember(allCategories) { allCategories.associateBy { it.id } }
    val productUnitsMap = remember(allProductUnits) { allProductUnits.groupBy { it.productId } }

    // Batches with available stock
    val activeBatches = remember(allBatches) {
        allBatches.filter { it.currentStockBase > 0 && it.isActive }.sortedBy { it.expiredDate }
    }
    val productStockMap = remember(activeBatches) {
        activeBatches.groupBy { it.productId }.mapValues { (_, bList) -> bList.sumOf { it.currentStockBase } }
    }

    // Filtered Products
    val filteredProducts = remember(allProducts, searchQuery, selectedCategoryId) {
        allProducts.filter { prod ->
            val matchesQuery = searchQuery.isBlank() ||
                    prod.name.contains(searchQuery, ignoreCase = true) ||
                    prod.code.contains(searchQuery, ignoreCase = true) ||
                    (prod.barcode?.contains(searchQuery, ignoreCase = true) == true) ||
                    (prod.genericName?.contains(searchQuery, ignoreCase = true) == true)
            val matchesCat = selectedCategoryId == null || prod.categoryId == selectedCategoryId
            matchesQuery && matchesCat
        }
    }

    val cartItemCount = remember(cartItems) { cartItems.sumOf { it.qty.toInt() } }
    val cartSubtotal = remember(cartItems) { cartItems.sumOf { it.subtotal } }
    val cartDiscount = remember(cartItems) { cartItems.sumOf { it.discount } }
    val cartGrandTotal = remember(cartSubtotal, cartDiscount) { (cartSubtotal - cartDiscount).coerceAtLeast(0.0) }

    // Function to add or increment item in cart
    fun addToCart(product: ProductEntity, unit: ProductUnitEntity, unitName: String, price: Double) {
        val totalStock = productStockMap[product.id] ?: 0.0
        val existingIndex = cartItems.indexOfFirst {
            it.product.id == product.id && it.selectedUnit.id == unit.id
        }

        if (existingIndex >= 0) {
            val existing = cartItems[existingIndex]
            val nextQty = existing.qty + 1.0
            if (nextQty * unit.conversionToBase <= totalStock) {
                cartItems = cartItems.toMutableList().apply {
                    set(existingIndex, existing.copy(qty = nextQty))
                }
            } else {
                Toast.makeText(context, "Stok obat tidak mencukupi!", Toast.LENGTH_SHORT).show()
            }
        } else {
            if (unit.conversionToBase <= totalStock) {
                cartItems = cartItems + CartItem(
                    product = product,
                    selectedUnit = unit,
                    unitName = unitName,
                    unitPrice = price,
                    qty = 1.0
                )
            } else {
                Toast.makeText(context, "Stok obat habis!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Kasir & POS Apotek",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick,
                actions = {
                    // Tarik Resep Siap Bayar Button with Badge
                    IconButton(
                        onClick = { showPrescriptionPicker = true },
                        modifier = Modifier.testTag("btn_tarik_resep")
                    ) {
                        BadgedBox(
                            badge = {
                                if (readyPrescriptions.isNotEmpty()) {
                                    Badge(
                                        containerColor = Rose500,
                                        contentColor = Color.White
                                    ) {
                                        Text("${readyPrescriptions.size}")
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.ReceiptLong,
                                contentDescription = "Tarik Resep Siap Bayar",
                                tint = Color.White
                            )
                        }
                    }

                    // Riwayat Transaksi shortcut
                    IconButton(onClick = { onNavigateTo(Screen.SalesHistory) }) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = "Riwayat Struk",
                            tint = Color.White
                        )
                    }
                }
            )
        },
        bottomBar = {
            // FLOATING/DOCKED BOTTOM CART BAR (Ketika di tab Katalog atau Keranjang)
            if (cartItems.isNotEmpty()) {
                Surface(
                    color = Color.White,
                    shadowElevation = 16.dp,
                    tonalElevation = 6.dp,
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                            .windowInsetsPadding(WindowInsets.navigationBars)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(22.dp)
                                            .clip(CircleShape)
                                            .background(Teal50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "$cartItemCount",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Teal700
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Total Tagihan:",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Slate500,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                Text(
                                    text = formatRupiah(cartGrandTotal),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Emerald700
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (currentTab == 0) {
                                    OutlinedButton(
                                        onClick = { currentTab = 1 },
                                        shape = RoundedCornerShape(12.dp),
                                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                                        modifier = Modifier.tactilePress()
                                    ) {
                                        Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Keranjang", fontWeight = FontWeight.Bold)
                                    }
                                }

                                Button(
                                    onClick = { showPaymentDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                                    shape = RoundedCornerShape(12.dp),
                                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
                                    modifier = Modifier
                                        .testTag("btn_bayar_checkout")
                                        .tactilePress()
                                ) {
                                    Icon(Icons.Default.Payments, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Bayar", fontWeight = FontWeight.ExtraBold, color = Color.White)
                                }
                            }
                        }
                    }
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
            // 1. TOP CONTROLS: SEARCH & CATEGORY CHIPS
            Surface(
                color = Color.White,
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    // Search Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari obat, kode, barcode, zat aktif...", fontSize = 14.sp) },
                            leadingIcon = {
                                Icon(Icons.Default.Search, contentDescription = null, tint = Teal600)
                            },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { searchQuery = "" }) {
                                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                                    }
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { keyboardController?.hide() }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Teal600,
                                unfocusedBorderColor = Slate200
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("search_medicine_input")
                        )

                        // Segmented View Toggle (Katalog vs Keranjang)
                        Surface(
                            color = Slate100,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(52.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    color = if (currentTab == 0) Color.White else Color.Transparent,
                                    shape = RoundedCornerShape(8.dp),
                                    shadowElevation = if (currentTab == 0) 2.dp else 0.dp,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable { currentTab = 0 }
                                        .padding(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.GridView,
                                        contentDescription = "Katalog",
                                        tint = if (currentTab == 0) Teal700 else Slate500,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Surface(
                                    color = if (currentTab == 1) Color.White else Color.Transparent,
                                    shape = RoundedCornerShape(8.dp),
                                    shadowElevation = if (currentTab == 1) 2.dp else 0.dp,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable { currentTab = 1 }
                                        .padding(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    BadgedBox(
                                        badge = {
                                            if (cartItems.isNotEmpty()) {
                                                Badge(
                                                    containerColor = Teal600,
                                                    contentColor = Color.White
                                                ) {
                                                    Text("$cartItemCount")
                                                }
                                            }
                                        }
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ShoppingCart,
                                            contentDescription = "Keranjang",
                                            tint = if (currentTab == 1) Teal700 else Slate500,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Category Filter Pills
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = selectedCategoryId == null,
                                onClick = { selectedCategoryId = null },
                                label = { Text("Semua Obat (${allProducts.size})") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Teal600,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }

                        items(allCategories) { cat ->
                            val count = allProducts.count { it.categoryId == cat.id }
                            FilterChip(
                                selected = selectedCategoryId == cat.id,
                                onClick = { selectedCategoryId = if (selectedCategoryId == cat.id) null else cat.id },
                                label = { Text("${cat.name} ($count)") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Teal600,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }

                    // ACTIVE PRESCRIPTION BANNER (JIKA TARIK RESEP)
                    if (selectedPrescription != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        val presc = selectedPrescription!!
                        Card(
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = Indigo50),
                            border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Indigo500, Cyan600))),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Indigo600),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.MedicalServices, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = presc.prescriptionNumber,
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Indigo600
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        StatusBadge(text = "Resep Dokter", containerColor = Indigo100, contentColor = Indigo600)
                                    }
                                    Text(
                                        text = "Pasien: ${presc.patientName} • Dr. ${presc.doctorName ?: "Umum"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate600
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        selectedPrescription = null
                                        cartItems = emptyList()
                                        Toast.makeText(context, "Resep dilepas dari kasir", Toast.LENGTH_SHORT).show()
                                    }
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Lepas Resep", tint = Rose500)
                                }
                            }
                        }
                    }
                }
            }

            // 2. MAIN BODY: TAB 0 (KATALOG OBAT) OR TAB 1 (KERANJANG BELANJA)
            AnimatedContent(
                targetState = currentTab,
                label = "CashierTabTransition",
                modifier = Modifier.weight(1f)
            ) { tab ->
                when (tab) {
                    0 -> {
                        // TAB 0: KATALOG OBAT
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Ready Prescriptions alert bar if any
                            if (readyPrescriptions.isNotEmpty() && selectedPrescription == null) {
                                item {
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Indigo50),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { showPrescriptionPicker = true }
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = Indigo600)
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "${readyPrescriptions.size} Resep Dokter Siap Bayar",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Indigo600
                                                )
                                                Text(
                                                    text = "Telah divalidasi Apoteker. Ketuk untuk tarik transaksi.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Slate600
                                                )
                                            }
                                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Indigo500, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                            }

                            if (filteredProducts.isEmpty()) {
                                item {
                                    EmptyStateView(
                                        title = "Obat Tidak Ditemukan",
                                        description = "Coba ubah kata kunci pencarian atau kategori filter.",
                                        icon = Icons.Default.SearchOff
                                    )
                                }
                            } else {
                                items(filteredProducts, key = { it.id }) { product ->
                                    val catName = categoriesMap[product.categoryId]?.name ?: "Umum"
                                    val totalStock = productStockMap[product.id] ?: 0.0
                                    val pUnits = productUnitsMap[product.id] ?: emptyList()
                                    val defaultUnit = pUnits.find { it.isDefaultSaleUnit } ?: pUnits.firstOrNull()
                                    val defaultUnitName = defaultUnit?.let { unitsMap[it.unitId]?.name } ?: "Unit"

                                    // FEFO active price
                                    val firstBatch = activeBatches.find { it.productId == product.id }
                                    val price = defaultUnit?.let { du ->
                                        allBatchPrices.find { it.batchId == firstBatch?.id && it.productUnitId == du.id }?.sellingPrice
                                            ?: (firstBatch?.hppBase?.times(du.conversionToBase)?.times(1.25) ?: 10000.0)
                                    } ?: 10000.0

                                    // Check if this item is currently in cart
                                    val inCartItem = cartItems.find { it.product.id == product.id && it.selectedUnit.id == defaultUnit?.id }

                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
                                        border = CardDefaults.outlinedCardBorder().copy(
                                            brush = Brush.linearGradient(
                                                listOf(
                                                    if (inCartItem != null) Teal500.copy(alpha = 0.5f) else Slate200,
                                                    Slate100
                                                )
                                            )
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                // Icon / Medicine avatar
                                                Box(
                                                    modifier = Modifier
                                                        .size(46.dp)
                                                        .clip(RoundedCornerShape(12.dp))
                                                        .background(
                                                            when (catName) {
                                                                "Obat Keras" -> Rose100
                                                                "Obat Bebas Terbatas" -> Cyan100
                                                                "Herbal & Suplemen" -> Emerald50
                                                                else -> Teal50
                                                            }
                                                        ),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = when (catName) {
                                                            "Obat Keras" -> Icons.Default.MedicalServices
                                                            "Herbal & Suplemen" -> Icons.Default.Spa
                                                            "Alat Kesehatan" -> Icons.Default.Sanitizer
                                                            else -> Icons.Default.Medication
                                                        },
                                                        contentDescription = null,
                                                        tint = when (catName) {
                                                            "Obat Keras" -> Rose500
                                                            "Obat Bebas Terbatas" -> Cyan700
                                                            "Herbal & Suplemen" -> Emerald700
                                                            else -> Teal700
                                                        },
                                                        modifier = Modifier.size(26.dp)
                                                    )
                                                }

                                                Spacer(modifier = Modifier.width(12.dp))

                                                Column(modifier = Modifier.weight(1f)) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(
                                                            text = product.name,
                                                            style = MaterialTheme.typography.titleMedium,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Slate900,
                                                            modifier = Modifier.weight(1f)
                                                        )

                                                        StatusBadge(
                                                            text = if (totalStock > 0) "Stok: ${totalStock.toInt()}" else "HABIS",
                                                            containerColor = if (totalStock > 10) Emerald50 else if (totalStock > 0) Amber100 else Rose100,
                                                            contentColor = if (totalStock > 10) Emerald700 else if (totalStock > 0) Amber700 else Rose500
                                                        )
                                                    }

                                                    Spacer(modifier = Modifier.height(2.dp))

                                                    Text(
                                                        text = "${product.code} • ${product.genericName ?: catName}",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = Slate500,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )

                                                    Spacer(modifier = Modifier.height(8.dp))

                                                    // Units and Pricing Row
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Column {
                                                            Text(
                                                                text = formatRupiah(price),
                                                                style = MaterialTheme.typography.titleMedium,
                                                                fontWeight = FontWeight.ExtraBold,
                                                                color = Emerald700
                                                            )
                                                            Text(
                                                                text = "per $defaultUnitName",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                color = Slate400
                                                            )
                                                        }

                                                        // Action: Stepper or Add button
                                                        if (defaultUnit != null && totalStock > 0) {
                                                            if (inCartItem != null) {
                                                                Row(
                                                                    verticalAlignment = Alignment.CenterVertically,
                                                                    modifier = Modifier
                                                                        .background(Teal50, RoundedCornerShape(20.dp))
                                                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                                                ) {
                                                                    IconButton(
                                                                        onClick = {
                                                                            val idx = cartItems.indexOf(inCartItem)
                                                                            if (idx >= 0) {
                                                                                if (inCartItem.qty > 1) {
                                                                                    cartItems = cartItems.toMutableList().apply {
                                                                                        set(idx, inCartItem.copy(qty = inCartItem.qty - 1))
                                                                                    }
                                                                                } else {
                                                                                    cartItems = cartItems.filter { it != inCartItem }
                                                                                }
                                                                            }
                                                                        },
                                                                        modifier = Modifier.size(30.dp)
                                                                    ) {
                                                                        Icon(Icons.Default.Remove, contentDescription = "Kurang", tint = Teal700, modifier = Modifier.size(18.dp))
                                                                    }

                                                                    Text(
                                                                        text = "${inCartItem.qty.toInt()}",
                                                                        style = MaterialTheme.typography.titleSmall,
                                                                        fontWeight = FontWeight.Bold,
                                                                        color = Teal800,
                                                                        modifier = Modifier.padding(horizontal = 8.dp)
                                                                    )

                                                                    IconButton(
                                                                        onClick = {
                                                                            addToCart(product, defaultUnit, defaultUnitName, price)
                                                                        },
                                                                        modifier = Modifier.size(30.dp)
                                                                    ) {
                                                                        Icon(Icons.Default.Add, contentDescription = "Tambah", tint = Teal700, modifier = Modifier.size(18.dp))
                                                                    }
                                                                }
                                                            } else {
                                                                Button(
                                                                    onClick = {
                                                                        addToCart(product, defaultUnit, defaultUnitName, price)
                                                                    },
                                                                    shape = RoundedCornerShape(10.dp),
                                                                    colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                                                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                                                                    modifier = Modifier.tactilePress()
                                                                ) {
                                                                    Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                                                                    Spacer(modifier = Modifier.width(6.dp))
                                                                    Text("+ Keranjang", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                                                }
                                                            }
                                                        } else {
                                                            Text(
                                                                text = "Stok Habis",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                color = Slate400,
                                                                fontWeight = FontWeight.Bold
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
                    1 -> {
                        // TAB 1: KERANJANG BELANJA
                        if (cartItems.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        modifier = Modifier
                                            .size(72.dp)
                                            .clip(CircleShape)
                                            .background(Slate100),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.RemoveShoppingCart, contentDescription = null, tint = Slate400, modifier = Modifier.size(36.dp))
                                    }
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Text("Keranjang Masih Kosong", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Slate700)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Pilih obat dari katalog untuk memulai transaksi kasir.", style = MaterialTheme.typography.bodySmall, color = Slate400, textAlign = TextAlign.Center)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = { currentTab = 0 },
                                        colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Buka Katalog Obat")
                                    }
                                }
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Header Keranjang & Customer Name Input
                                item {
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "Informasi Pelanggan",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Slate800
                                                )
                                                TextButton(
                                                    onClick = { cartItems = emptyList() },
                                                    contentPadding = PaddingValues(0.dp)
                                                ) {
                                                    Icon(Icons.Default.DeleteSweep, contentDescription = null, tint = Rose500, modifier = Modifier.size(16.dp))
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text("Kosongkan", color = Rose500, style = MaterialTheme.typography.labelSmall)
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(6.dp))

                                            OutlinedTextField(
                                                value = customerName,
                                                onValueChange = { customerName = it },
                                                label = { Text("Nama Pelanggan / Pasien") },
                                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Teal600) },
                                                singleLine = true,
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.fillMaxWidth()
                                            )
                                        }
                                    }
                                }

                                // List of Cart Items
                                items(cartItems) { item ->
                                    val pUnits = productUnitsMap[item.product.id] ?: emptyList()
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(
                                                        text = item.product.name,
                                                        style = MaterialTheme.typography.titleSmall,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Slate900
                                                    )
                                                    Text(
                                                        text = "${formatRupiah(item.unitPrice)} / ${item.unitName}",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = Slate500
                                                    )
                                                }

                                                IconButton(
                                                    onClick = { cartItems = cartItems.filter { it != item } },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.DeleteOutline, contentDescription = "Hapus", tint = Rose500, modifier = Modifier.size(20.dp))
                                                }
                                            }

                                            // Unit Switcher Chips if product has multiple units
                                            if (pUnits.size > 1) {
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    pUnits.forEach { uOpt ->
                                                        val uName = unitsMap[uOpt.unitId]?.name ?: "Unit"
                                                        val isSelected = uOpt.id == item.selectedUnit.id
                                                        val firstBatch = activeBatches.find { it.productId == item.product.id }
                                                        val uPrice = allBatchPrices.find { it.batchId == firstBatch?.id && it.productUnitId == uOpt.id }?.sellingPrice
                                                            ?: (firstBatch?.hppBase?.times(uOpt.conversionToBase)?.times(1.25) ?: 10000.0)

                                                        Surface(
                                                            color = if (isSelected) Teal600 else Slate100,
                                                            shape = RoundedCornerShape(6.dp),
                                                            modifier = Modifier.clickable {
                                                                val idx = cartItems.indexOf(item)
                                                                if (idx >= 0) {
                                                                    cartItems = cartItems.toMutableList().apply {
                                                                        set(idx, item.copy(selectedUnit = uOpt, unitName = uName, unitPrice = uPrice))
                                                                    }
                                                                }
                                                            }
                                                        ) {
                                                            Text(
                                                                text = "$uName (${formatRupiah(uPrice)})",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                                color = if (isSelected) Color.White else Slate700,
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(8.dp))
                                            Divider(color = Slate100)
                                            Spacer(modifier = Modifier.height(8.dp))

                                            // Stepper & Subtotal
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier
                                                        .background(Slate100, RoundedCornerShape(20.dp))
                                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                                ) {
                                                    IconButton(
                                                        onClick = {
                                                            val idx = cartItems.indexOf(item)
                                                            if (idx >= 0) {
                                                                if (item.qty > 1) {
                                                                    cartItems = cartItems.toMutableList().apply {
                                                                        set(idx, item.copy(qty = item.qty - 1))
                                                                    }
                                                                } else {
                                                                    cartItems = cartItems.filter { it != item }
                                                                }
                                                            }
                                                        },
                                                        modifier = Modifier.size(28.dp)
                                                    ) {
                                                        Icon(Icons.Default.Remove, contentDescription = "Kurang", tint = Slate700, modifier = Modifier.size(16.dp))
                                                    }

                                                    Text(
                                                        text = "${item.qty.toInt()} ${item.unitName}",
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Slate900,
                                                        modifier = Modifier.padding(horizontal = 8.dp)
                                                    )

                                                    IconButton(
                                                        onClick = {
                                                            val totalStock = productStockMap[item.product.id] ?: 0.0
                                                            val nextQty = item.qty + 1.0
                                                            if (nextQty * item.selectedUnit.conversionToBase <= totalStock) {
                                                                val idx = cartItems.indexOf(item)
                                                                if (idx >= 0) {
                                                                    cartItems = cartItems.toMutableList().apply {
                                                                        set(idx, item.copy(qty = nextQty))
                                                                    }
                                                                }
                                                            } else {
                                                                Toast.makeText(context, "Maksimal stok tercapai!", Toast.LENGTH_SHORT).show()
                                                            }
                                                        },
                                                        modifier = Modifier.size(28.dp)
                                                    ) {
                                                        Icon(Icons.Default.Add, contentDescription = "Tambah", tint = Slate700, modifier = Modifier.size(16.dp))
                                                    }
                                                }

                                                Text(
                                                    text = formatRupiah(item.total),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = Emerald700
                                                )
                                            }
                                        }
                                    }
                                }

                                // Ringkasan Belanja Card
                                item {
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(14.dp)) {
                                            Text(
                                                text = "Ringkasan Pembayaran",
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Slate800
                                            )
                                            Spacer(modifier = Modifier.height(10.dp))
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text("Subtotal ($cartItemCount item)", style = MaterialTheme.typography.bodyMedium, color = Slate600)
                                                Text(formatRupiah(cartSubtotal), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Slate800)
                                            }

                                            if (cartDiscount > 0) {
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Text("Diskon Promo", style = MaterialTheme.typography.bodyMedium, color = Rose500)
                                                    Text("- ${formatRupiah(cartDiscount)}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Rose500)
                                                }
                                            }

                                            Divider(modifier = Modifier.padding(vertical = 10.dp), color = Slate200)

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text("Grand Total:", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = Slate900)
                                                Text(
                                                    text = formatRupiah(cartGrandTotal),
                                                    style = MaterialTheme.typography.headlineSmall,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = Emerald700
                                                )
                                            }
                                        }
                                    }
                                }

                                item {
                                    Spacer(modifier = Modifier.height(40.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // DIALOG: TARIK RESEP DOKTER SIAP BAYAR
    // -------------------------------------------------------------------------
    if (showPrescriptionPicker) {
        Dialog(
            onDismissRequest = { showPrescriptionPicker = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .padding(vertical = 24.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Indigo100),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = Indigo600)
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Resep Dokter Siap Bayar",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900
                                )
                                Text(
                                    text = "Pilih resep yang telah divalidasi Apoteker",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }
                        }

                        IconButton(onClick = { showPrescriptionPicker = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Tutup")
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Divider(color = Slate200)
                    Spacer(modifier = Modifier.height(14.dp))

                    if (readyPrescriptions.isEmpty()) {
                        EmptyStateView(
                            title = "Tidak Ada Resep Menunggu",
                            description = "Semua resep dokter telah selesai diproses atau belum ada resep berstatus SIAP BAYAR.",
                            icon = Icons.Default.MedicalInformation
                        )
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 380.dp)
                        ) {
                            items(readyPrescriptions) { presc ->
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Slate50),
                                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Indigo500, Slate200))),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            coroutineScope.launch {
                                                val pItems = repository.getPrescriptionItems(presc.id)
                                                val newCartItems = mutableListOf<CartItem>()
                                                for (pi in pItems) {
                                                    val prod = allProducts.find { it.id == pi.productId }
                                                    val pUnit = allProductUnits.find { it.id == pi.productUnitId }
                                                    if (prod != null && pUnit != null) {
                                                        val firstBatch = activeBatches.find { it.productId == prod.id }
                                                        val uPrice = allBatchPrices.find {
                                                            it.batchId == firstBatch?.id && it.productUnitId == pUnit.id
                                                        }?.sellingPrice ?: (firstBatch?.hppBase?.times(pUnit.conversionToBase)?.times(1.25) ?: 10000.0)

                                                        newCartItems.add(
                                                            CartItem(
                                                                product = prod,
                                                                selectedUnit = pUnit,
                                                                unitName = pi.unitName,
                                                                unitPrice = uPrice,
                                                                qty = pi.qtySaleUnit
                                                            )
                                                        )
                                                    }
                                                }
                                                cartItems = newCartItems
                                                selectedPrescription = presc
                                                customerName = presc.patientName
                                                currentTab = 1
                                                showPrescriptionPicker = false
                                                Toast.makeText(context, "Resep ${presc.prescriptionNumber} berhasil ditarik ke kasir!", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = presc.prescriptionNumber,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Indigo600
                                            )
                                            StatusBadge(text = "SIAP BAYAR", containerColor = Emerald50, contentColor = Emerald700)
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))

                                        Text(
                                            text = "Pasien: ${presc.patientName} (${presc.patientPhone ?: "Tanpa Telp"})",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Slate800
                                        )
                                        Text(
                                            text = "Dokter: ${presc.doctorName ?: "Umum"} • Apoteker: ${presc.pharmacistName}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Slate500
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.End,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "Ketuk untuk Tarik ke Kasir",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Indigo600
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Indigo600, modifier = Modifier.size(14.dp))
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

    // -------------------------------------------------------------------------
    // DIALOG: PEMBAYARAN TRANSAKSI (PAYMENT MODAL)
    // -------------------------------------------------------------------------
    if (showPaymentDialog) {
        var paymentMethod by remember { mutableStateOf("CASH") }
        var paidAmountText by remember { mutableStateOf(cartGrandTotal.toInt().toString()) }
        val paidAmount = paidAmountText.toDoubleOrNull() ?: 0.0
        val changeAmount = (paidAmount - cartGrandTotal).coerceAtLeast(0.0)

        Dialog(
            onDismissRequest = { if (!isCheckingOut) showPaymentDialog = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier
                    .fillMaxWidth(0.94f)
                    .padding(vertical = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Title Bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(Emerald50),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Payments, contentDescription = null, tint = Emerald700)
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Pembayaran Transaksi",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Slate900
                                )
                                Text(
                                    text = "Pelanggan: $customerName",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }
                        }

                        IconButton(
                            onClick = { showPaymentDialog = false },
                            enabled = !isCheckingOut
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Tutup")
                        }
                    }

                    // Total Tagihan Hero Box
                    Surface(
                        color = Slate900,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "TOTAL TAGIHAN KASIR",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate400,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = formatRupiah(cartGrandTotal),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                            Text(
                                text = "$cartItemCount item • Snapshot HPP & FEFO otomatis",
                                style = MaterialTheme.typography.labelSmall,
                                color = Emerald500
                            )
                        }
                    }

                    // Payment Methods Selector
                    Text("Pilih Metode Pembayaran:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = Slate700)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(
                            Triple("CASH", "Tunai", Icons.Default.Money),
                            Triple("QRIS", "QRIS", Icons.Default.QrCode),
                            Triple("TRANSFER", "Transfer", Icons.Default.AccountBalance)
                        ).forEach { (method, label, icon) ->
                            val isSelected = paymentMethod == method
                            Surface(
                                color = if (isSelected) Teal600 else Slate100,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        paymentMethod = method
                                        if (method != "CASH") {
                                            paidAmountText = cartGrandTotal.toInt().toString()
                                        }
                                    }
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else Slate700,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = label,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White else Slate800
                                    )
                                }
                            }
                        }
                    }

                    // Content based on method
                    when (paymentMethod) {
                        "CASH" -> {
                            // Input Uang Diterima
                            OutlinedTextField(
                                value = paidAmountText,
                                onValueChange = { paidAmountText = it.filter { char -> char.isDigit() } },
                                label = { Text("Jumlah Uang Diterima (Rp)") },
                                leadingIcon = { Text("Rp", fontWeight = FontWeight.Bold, color = Teal700, modifier = Modifier.padding(start = 12.dp)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Teal600,
                                    unfocusedBorderColor = Slate300
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("input_uang_diterima")
                            )

                            // Fast Cash Shortcuts
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                val baseGrand = cartGrandTotal.toInt()
                                val shortcuts = remember(baseGrand) {
                                    val list = mutableListOf<Pair<String, Int>>()
                                    list.add("Uang Pas" to baseGrand)
                                    if (baseGrand < 20000) list.add("20.000" to 20000)
                                    if (baseGrand < 50000) list.add("50.000" to 50000)
                                    if (baseGrand < 100000) list.add("100.000" to 100000)
                                    list.take(4)
                                }

                                shortcuts.forEach { (label, amount) ->
                                    Surface(
                                        color = if (paidAmount.toInt() == amount) Teal50 else Slate100,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { paidAmountText = amount.toString() }
                                    ) {
                                        Text(
                                            text = label,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = if (paidAmount.toInt() == amount) Teal700 else Slate700,
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier.padding(vertical = 8.dp)
                                        )
                                    }
                                }
                            }

                            // Kembalian Box
                            Surface(
                                color = if (paidAmount >= cartGrandTotal) Emerald50 else Rose100,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = if (paidAmount >= cartGrandTotal) Icons.Default.CheckCircle else Icons.Default.Error,
                                            contentDescription = null,
                                            tint = if (paidAmount >= cartGrandTotal) Emerald700 else Rose500,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = if (paidAmount >= cartGrandTotal) "Kembalian:" else "Uang Masih Kurang:",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = if (paidAmount >= cartGrandTotal) Emerald800 else Rose500
                                        )
                                    }

                                    Text(
                                        text = if (paidAmount >= cartGrandTotal) formatRupiah(changeAmount) else formatRupiah(cartGrandTotal - paidAmount),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (paidAmount >= cartGrandTotal) Emerald800 else Rose500
                                    )
                                }
                            }
                        }
                        "QRIS" -> {
                            Surface(
                                color = Cyan50,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = Cyan700, modifier = Modifier.size(48.dp))
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("QRIS Dinamis Apotek", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Cyan700)
                                    Text("Tunjukkan QR ke pelanggan untuk scan via BCA, GoPay, OVO, Dana", style = MaterialTheme.typography.bodySmall, color = Slate600, textAlign = TextAlign.Center)
                                }
                            }
                        }
                        "TRANSFER" -> {
                            Surface(
                                color = Indigo50,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Rekening Tujuan Apotek:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Indigo600)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("• BCA: 822-019-8821 (Apotek Risyah)", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = Slate800)
                                    Text("• Mandiri: 152-00-998811-2 (Apotek Risyah)", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = Slate800)
                                }
                            }
                        }
                    }

                    if (errorMessage != null) {
                        Text(
                            text = errorMessage ?: "",
                            color = Rose500,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showPaymentDialog = false },
                            enabled = !isCheckingOut,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Batal")
                        }

                        Button(
                            onClick = {
                                isCheckingOut = true
                                errorMessage = null
                                coroutineScope.launch {
                                    val result = repository.checkoutSale(
                                        cashierId = currentUser?.id ?: "u_kasir",
                                        cashierName = currentUser?.name ?: "Kasir",
                                        cartItems = cartItems,
                                        paymentMethod = paymentMethod,
                                        paidAmount = if (paymentMethod == "CASH") paidAmount else cartGrandTotal,
                                        prescriptionId = selectedPrescription?.id
                                    )
                                    isCheckingOut = false
                                    result.onSuccess { sale ->
                                        completedSale = sale
                                        cartItems = emptyList()
                                        selectedPrescription = null
                                        customerName = "Pelanggan Umum"
                                        currentTab = 0
                                        showPaymentDialog = false
                                        showReceiptDialog = true
                                    }.onFailure {
                                        errorMessage = it.message ?: "Gagal menyelesaikan transaksi"
                                    }
                                }
                            },
                            enabled = !isCheckingOut && (paymentMethod != "CASH" || paidAmount >= cartGrandTotal),
                            colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1.4f)
                                .testTag("btn_konfirmasi_simpan_transaksi")
                        ) {
                            if (isCheckingOut) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Menyimpan...")
                            } else {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Proses & Selesai", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // DIALOG: STRUK PEMBAYARAN THERMAL (RECEIPT PREVIEW)
    // -------------------------------------------------------------------------
    if (showReceiptDialog && completedSale != null) {
        val sale = completedSale!!
        Dialog(
            onDismissRequest = { showReceiptDialog = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .padding(vertical = 20.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp)
                ) {
                    // Success Banner
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Emerald50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(28.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Transaksi Berhasil!", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = Emerald700)
                            Text("Struk transaksi resmi siap dicetak.", style = MaterialTheme.typography.bodySmall, color = Slate500)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // THERMAL RECEIPT CONTAINER
                    Surface(
                        color = Slate50,
                        shape = RoundedCornerShape(12.dp),
                        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Slate300, Slate200))),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = appSettings?.pharmacyName ?: "APOTEK RISYAH",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = Slate900,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = appSettings?.address ?: "Jl. Perintis Kemerdekaan KM 10, Makassar",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate600,
                                textAlign = TextAlign.Center,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "SIPA: 503/SIPA/092/Dinkes-Mks",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate500,
                                fontFamily = FontFamily.Monospace
                            )

                            Text(
                                text = "------------------------------------------",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate400,
                                fontFamily = FontFamily.Monospace
                            )

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("No. Struk :", style = MaterialTheme.typography.labelSmall, color = Slate600, fontFamily = FontFamily.Monospace)
                                Text(sale.saleNumber, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Waktu     :", style = MaterialTheme.typography.labelSmall, color = Slate600, fontFamily = FontFamily.Monospace)
                                Text(formatDateTime(sale.createdAt), style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Kasir     :", style = MaterialTheme.typography.labelSmall, color = Slate600, fontFamily = FontFamily.Monospace)
                                Text(sale.cashierName, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Metode    :", style = MaterialTheme.typography.labelSmall, color = Slate600, fontFamily = FontFamily.Monospace)
                                Text(sale.paymentMethod, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            Text(
                                text = "------------------------------------------",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate400,
                                fontFamily = FontFamily.Monospace
                            )

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("TOTAL BELANJA", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                Text(formatRupiah(sale.grandTotal), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.ExtraBold, color = Emerald700, fontFamily = FontFamily.Monospace)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("UANG DITERIMA", style = MaterialTheme.typography.bodySmall, color = Slate600, fontFamily = FontFamily.Monospace)
                                Text(formatRupiah(sale.paidAmount), style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("KEMBALIAN", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                Text(formatRupiah(sale.changeAmount), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            Text(
                                text = "------------------------------------------",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate400,
                                fontFamily = FontFamily.Monospace
                            )

                            Text(
                                text = "Semoga Lekas Sembuh & Terima Kasih",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate600,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                Toast.makeText(context, "Mencetak struk thermal 58mm...", Toast.LENGTH_SHORT).show()
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Cetak")
                        }

                        Button(
                            onClick = { showReceiptDialog = false },
                            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1.3f)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Transaksi Baru", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
