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
import java.util.UUID

@Composable
fun MasterDataScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allCategories by repository.allCategories.collectAsState(initial = emptyList())
    val allUnits by repository.allUnits.collectAsState(initial = emptyList())
    val allSuppliers by repository.allSuppliers.collectAsState(initial = emptyList())
    val allProductUnits by repository.allProductUnits.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    // Dialog States
    var showProductDialog by remember { mutableStateOf(false) }
    var showCategoryDialog by remember { mutableStateOf(false) }
    var showUnitDialog by remember { mutableStateOf(false) }
    var showSupplierDialog by remember { mutableStateOf(false) }

    val unitsMap = remember(allUnits) { allUnits.associateBy { it.id } }
    val categoriesMap = remember(allCategories) { allCategories.associateBy { it.id } }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Master Data Apotek",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick
            )
        },
        floatingActionButton = {
            if (currentUser?.role == "MANAGER") {
                FloatingActionButton(
                    onClick = {
                        when (selectedTab) {
                            0 -> showProductDialog = true
                            1 -> showCategoryDialog = true
                            2 -> showUnitDialog = true
                            3 -> showSupplierDialog = true
                        }
                    },
                    containerColor = Teal600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Data")
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
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Teal600,
                edgePadding = 16.dp
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Obat & Produk (${allProducts.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Kategori (${allCategories.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("Satuan (${allUnits.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    text = { Text("Supplier / PBF (${allSuppliers.size})", fontWeight = FontWeight.Bold) }
                )
            }

            Surface(
                color = Color.White,
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Teal600) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                )
            }

            when (selectedTab) {
                0 -> {
                    // Products List
                    val filteredProds = remember(allProducts, searchQuery) {
                        if (searchQuery.isBlank()) allProducts
                        else allProducts.filter {
                            it.name.contains(searchQuery, ignoreCase = true) ||
                                    it.code.contains(searchQuery, ignoreCase = true) ||
                                    (it.genericName?.contains(searchQuery, ignoreCase = true) == true)
                        }
                    }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredProds) { prod ->
                            val catName = categoriesMap[prod.categoryId]?.name ?: "Umum"
                            val baseUnitName = unitsMap[prod.baseUnitId]?.name ?: "Unit"
                            val pUnits = allProductUnits.filter { it.productId == prod.id }

                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(44.dp)
                                            .clip(CircleShape)
                                            .background(Teal50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Medication, contentDescription = null, tint = Teal600, modifier = Modifier.size(24.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(prod.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                        Text("${prod.code} • ${prod.genericName ?: "-"} • $catName", style = MaterialTheme.typography.bodySmall, color = Slate600)
                                        Text("Satuan Dasar: $baseUnitName • Min Stok: ${prod.minStockBase.toInt()}", style = MaterialTheme.typography.labelSmall, color = Slate400)
                                    }
                                    StatusBadge(
                                        text = "${pUnits.size} Satuan Jual",
                                        containerColor = Teal50,
                                        contentColor = Teal700
                                    )
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // Categories
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(allCategories) { cat ->
                            Card(
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(cat.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                    if (!cat.description.isNullOrBlank()) {
                                        Text(cat.description ?: "", style = MaterialTheme.typography.bodySmall, color = Slate500)
                                    }
                                }
                            }
                        }
                    }
                }
                2 -> {
                    // Units
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(allUnits) { unit ->
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
                                    Text(unit.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                    Text(unit.symbol ?: "", style = MaterialTheme.typography.bodySmall, color = Slate500)
                                }
                            }
                        }
                    }
                }
                3 -> {
                    // Suppliers
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(allSuppliers) { sup ->
                            Card(
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(sup.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                    Text("Telp: ${sup.phone ?: "-"} • Kontak: ${sup.contactPerson ?: "-"}", style = MaterialTheme.typography.bodySmall, color = Slate600)
                                    if (!sup.address.isNullOrBlank()) {
                                        Text("Alamat: ${sup.address}", style = MaterialTheme.typography.labelSmall, color = Slate400)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Add Product Dialog
    if (showProductDialog) {
        var name by remember { mutableStateOf("") }
        var code by remember { mutableStateOf("PRD-${(100..999).random()}") }
        var genericName by remember { mutableStateOf("") }
        var minStock by remember { mutableStateOf("10") }
        var selectedCatId by remember { mutableStateOf(allCategories.firstOrNull()?.id ?: "") }
        var selectedBaseUnitId by remember { mutableStateOf(allUnits.firstOrNull()?.id ?: "") }

        AlertDialog(
            onDismissRequest = { showProductDialog = false },
            title = { Text("Tambah Obat / Produk Baru", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Nama Obat & Sediaan") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(
                                value = code,
                                onValueChange = { code = it },
                                label = { Text("Kode Obat") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = minStock,
                                onValueChange = { minStock = it },
                                label = { Text("Min Stok") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                    item {
                        OutlinedTextField(
                            value = genericName,
                            onValueChange = { genericName = it },
                            label = { Text("Nama Generik / Zat Aktif") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        Text("Kategori Obat:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        allCategories.forEach { cat ->
                            Surface(
                                color = if (selectedCatId == cat.id) Teal50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedCatId = cat.id }
                            ) {
                                Text(
                                    text = cat.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (selectedCatId == cat.id) Teal800 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }
                    item {
                        Text("Satuan Dasar Terkecil (Base Unit):", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        allUnits.forEach { unit ->
                            Surface(
                                color = if (selectedBaseUnitId == unit.id) Emerald50 else Slate50,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp)
                                    .clickable { selectedBaseUnitId = unit.id }
                            ) {
                                Text(
                                    text = unit.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (selectedBaseUnitId == unit.id) Emerald700 else Slate800,
                                    modifier = Modifier.padding(6.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            coroutineScope.launch {
                                val prodId = "prod_${UUID.randomUUID()}"
                                val baseUnit = ProductUnitEntity(
                                    id = "pu_${UUID.randomUUID()}",
                                    productId = prodId,
                                    unitId = selectedBaseUnitId,
                                    conversionToBase = 1.0,
                                    isDefaultSaleUnit = true,
                                    isSaleUnit = true
                                )
                                repository.saveProduct(
                                    id = prodId,
                                    categoryId = selectedCatId,
                                    baseUnitId = selectedBaseUnitId,
                                    code = code,
                                    barcode = null,
                                    name = name,
                                    genericName = genericName.ifBlank { null },
                                    minStockBase = minStock.toDoubleOrNull() ?: 10.0,
                                    units = listOf(baseUnit)
                                )
                                showProductDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Text("Simpan Obat")
                }
            },
            dismissButton = {
                TextButton(onClick = { showProductDialog = false }) { Text("Batal") }
            }
        )
    }

    // Add Category Dialog
    if (showCategoryDialog) {
        var catName by remember { mutableStateOf("") }
        var catDesc by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showCategoryDialog = false },
            title = { Text("Tambah Kategori Obat", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = catName, onValueChange = { catName = it }, label = { Text("Nama Kategori") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = catDesc, onValueChange = { catDesc = it }, label = { Text("Deskripsi") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (catName.isNotBlank()) {
                            coroutineScope.launch {
                                repository.saveCategory(CategoryEntity("cat_${UUID.randomUUID()}", catName, catDesc))
                                showCategoryDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showCategoryDialog = false }) { Text("Batal") } }
        )
    }

    // Add Unit Dialog
    if (showUnitDialog) {
        var uName by remember { mutableStateOf("") }
        var uSymbol by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showUnitDialog = false },
            title = { Text("Tambah Satuan Obat", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = uName, onValueChange = { uName = it }, label = { Text("Nama Satuan (misal: Strip)") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = uSymbol, onValueChange = { uSymbol = it }, label = { Text("Singkatan (misal: Str)") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (uName.isNotBlank()) {
                            coroutineScope.launch {
                                repository.saveUnit(UnitEntity("unit_${UUID.randomUUID()}", uName, uSymbol.ifBlank { uName }))
                                showUnitDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showUnitDialog = false }) { Text("Batal") } }
        )
    }

    // Add Supplier Dialog
    if (showSupplierDialog) {
        var sName by remember { mutableStateOf("") }
        var sPhone by remember { mutableStateOf("") }
        var sAddress by remember { mutableStateOf("") }
        var sContact by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showSupplierDialog = false },
            title = { Text("Tambah Supplier / PBF", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = sName, onValueChange = { sName = it }, label = { Text("Nama PT / Distributor PBF") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = sPhone, onValueChange = { sPhone = it }, label = { Text("No. Telepon") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = sContact, onValueChange = { sContact = it }, label = { Text("Kontak Person / Sales") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = sAddress, onValueChange = { sAddress = it }, label = { Text("Alamat") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (sName.isNotBlank()) {
                            coroutineScope.launch {
                                repository.saveSupplier(SupplierEntity("sup_${UUID.randomUUID()}", sName, sPhone, sAddress, sContact))
                                showSupplierDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showSupplierDialog = false }) { Text("Batal") } }
        )
    }
}
