package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.data.db.AppDatabase
import com.example.data.model.UserEntity
import com.example.data.repository.PharmacyRepository
import com.example.ui.navigation.Screen
import com.example.ui.screens.*
import com.example.ui.theme.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val database = AppDatabase.getDatabase(this)
        val repository = PharmacyRepository(database)

        setContent {
            POSApotekTheme {
                MainApp(repository = repository)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainApp(repository: PharmacyRepository) {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Dashboard.route

    var showMenuBottomSheet by remember { mutableStateOf(false) }

    val role = currentUser?.role ?: "MANAGER"

    // Semua menu yang diizinkan sesuai role
    val allNavItems = remember(role) {
        val items = mutableListOf<Triple<Screen, ImageVector, String>>()
        items.add(Triple(Screen.Dashboard, Icons.Default.Dashboard, "Dashboard"))

        if (role in listOf("KASIR", "MANAGER")) {
            items.add(Triple(Screen.Cashier, Icons.Default.PointOfSale, "Kasir & Transaksi"))
            items.add(Triple(Screen.SalesHistory, Icons.Default.ReceiptLong, "Riwayat Penjualan"))
        }

        if (role in listOf("APOTEKER", "MANAGER")) {
            items.add(Triple(Screen.Prescription, Icons.Default.MedicalServices, "Pelayanan Resep"))
            items.add(Triple(Screen.Counseling, Icons.Default.VolunteerActivism, "Konseling Obat"))
        }

        if (role in listOf("APOTEKER", "MANAGER")) {
            items.add(Triple(Screen.PurchaseOrder, Icons.Default.Description, "Pemesanan (PO)"))
        }

        if (role == "MANAGER") {
            items.add(Triple(Screen.Purchase, Icons.Default.LocalShipping, "Pembelian Supplier"))
        }

        if (role in listOf("MANAGER", "APOTEKER")) {
            items.add(Triple(Screen.Stock, Icons.Default.Inventory, "Stok & Mutasi"))
            items.add(Triple(Screen.MasterData, Icons.Default.Category, "Master Data"))
        }

        if (role in listOf("MANAGER", "PEMILIK")) {
            items.add(Triple(Screen.Reports, Icons.Default.BarChart, "Laporan & Laba"))
        }

        if (role == "MANAGER") {
            items.add(Triple(Screen.UsersAndSettings, Icons.Default.Settings, "Pengguna & Pengaturan"))
        }

        items
    }

    // 4-5 Menu Utama untuk Bottom Navigation Smartphone
    val bottomBarItems = remember(role) {
        when (role) {
            "KASIR" -> listOf(
                Triple(Screen.Dashboard, Icons.Default.Dashboard, "Beranda"),
                Triple(Screen.Cashier, Icons.Default.PointOfSale, "Kasir"),
                Triple(Screen.SalesHistory, Icons.Default.ReceiptLong, "Riwayat"),
                Triple(Screen.Prescription, Icons.Default.MedicalServices, "Resep")
            )
            "APOTEKER" -> listOf(
                Triple(Screen.Dashboard, Icons.Default.Dashboard, "Beranda"),
                Triple(Screen.Prescription, Icons.Default.MedicalServices, "Resep"),
                Triple(Screen.Counseling, Icons.Default.VolunteerActivism, "Konseling"),
                Triple(Screen.Stock, Icons.Default.Inventory, "Stok")
            )
            "PEMILIK" -> listOf(
                Triple(Screen.Dashboard, Icons.Default.Dashboard, "Beranda"),
                Triple(Screen.Reports, Icons.Default.BarChart, "Laporan")
            )
            else -> listOf( // MANAGER
                Triple(Screen.Dashboard, Icons.Default.Dashboard, "Beranda"),
                Triple(Screen.Cashier, Icons.Default.PointOfSale, "Kasir"),
                Triple(Screen.Stock, Icons.Default.Inventory, "Stok"),
                Triple(Screen.Reports, Icons.Default.BarChart, "Laporan")
            )
        }
    }

    val isAuthScreen = currentRoute == Screen.Login.route

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isTablet = maxWidth >= 600.dp

        ModalNavigationDrawer(
            drawerState = drawerState,
            gesturesEnabled = !isAuthScreen,
            drawerContent = {
                ModalDrawerSheet(
                    drawerContainerColor = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.width(300.dp)
                ) {
                    // Header Drawer
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Teal600)
                            .padding(20.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(CircleShape)
                                        .background(Color.White),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.LocalPharmacy,
                                        contentDescription = null,
                                        tint = Teal600,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "Apotek Risyah",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "Sistem POS & FEFO V2",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White.copy(alpha = 0.85f)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(14.dp))
                            Surface(
                                color = Color.White.copy(alpha = 0.18f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${currentUser?.name ?: "User"} • ${currentUser?.role ?: "-"}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // List Navigation Drawer
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                    ) {
                        allNavItems.forEach { (screen, icon, title) ->
                            val isSelected = currentRoute == screen.route
                            NavigationDrawerItem(
                                icon = { Icon(icon, contentDescription = null, tint = if (isSelected) Teal600 else Slate600) },
                                label = {
                                    Text(
                                        text = title,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) Teal800 else Slate800,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                },
                                selected = isSelected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    navController.navigate(screen.route) {
                                        popUpTo(Screen.Dashboard.route)
                                        launchSingleTop = true
                                    }
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 3.dp)
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                    // Ganti Akun / Logout
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.Logout, contentDescription = null, tint = Rose500) },
                        label = { Text("Ganti Akun", color = Rose500, fontWeight = FontWeight.Bold) },
                        selected = false,
                        onClick = {
                            scope.launch { drawerState.close() }
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }
            }
        ) {
            Row(modifier = Modifier.fillMaxSize()) {
                // ==================== TABLET NAVIGATION RAIL ====================
                if (isTablet && !isAuthScreen) {
                    NavigationRail(
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.onSurface,
                        header = {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(vertical = 12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(Teal600),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.LocalPharmacy,
                                        contentDescription = "Apotek",
                                        tint = Color.White,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "APOTEK",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Teal700
                                )
                            }
                        },
                        modifier = Modifier.width(84.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState()),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            allNavItems.forEach { (screen, icon, title) ->
                                val isSelected = currentRoute == screen.route
                                NavigationRailItem(
                                    selected = isSelected,
                                    onClick = {
                                        navController.navigate(screen.route) {
                                            popUpTo(Screen.Dashboard.route)
                                            launchSingleTop = true
                                        }
                                    },
                                    icon = {
                                        Icon(icon, contentDescription = title)
                                    },
                                    label = {
                                        Text(
                                            text = title.take(8),
                                            style = MaterialTheme.typography.labelSmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    },
                                    colors = NavigationRailItemDefaults.colors(
                                        selectedIconColor = Teal700,
                                        selectedTextColor = Teal800,
                                        indicatorColor = Teal100,
                                        unselectedIconColor = Slate600,
                                        unselectedTextColor = Slate600
                                    ),
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                            }
                        }

                        IconButton(
                            onClick = {
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                            modifier = Modifier.padding(bottom = 16.dp)
                        ) {
                            Icon(Icons.Default.Logout, contentDescription = "Keluar", tint = Rose500)
                        }
                    }

                    VerticalDivider(color = Slate200)
                }

                // ==================== MAIN CONTENT & BOTTOM BAR (SMARTPHONE) ====================
                Scaffold(
                    modifier = Modifier.weight(1f),
                    bottomBar = {
                        if (!isTablet && !isAuthScreen) {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface,
                                tonalElevation = 6.dp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .navigationBarsPadding()
                            ) {
                                bottomBarItems.forEach { (screen, icon, title) ->
                                    val isSelected = currentRoute == screen.route
                                    NavigationBarItem(
                                        selected = isSelected,
                                        onClick = {
                                            navController.navigate(screen.route) {
                                                popUpTo(Screen.Dashboard.route)
                                                launchSingleTop = true
                                            }
                                        },
                                        icon = {
                                            Icon(
                                                imageVector = icon,
                                                contentDescription = title,
                                                modifier = Modifier.size(24.dp)
                                            )
                                        },
                                        label = {
                                            Text(
                                                text = title,
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                            )
                                        },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Teal700,
                                            selectedTextColor = Teal800,
                                            indicatorColor = Teal100,
                                            unselectedIconColor = Slate600,
                                            unselectedTextColor = Slate600
                                        )
                                    )
                                }

                                // Menu Semua Modul
                                NavigationBarItem(
                                    selected = showMenuBottomSheet,
                                    onClick = { showMenuBottomSheet = true },
                                    icon = {
                                        Icon(
                                            Icons.Default.Apps,
                                            contentDescription = "Menu Lengkap",
                                            modifier = Modifier.size(24.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            text = "Menu",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Medium
                                        )
                                    },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Teal700,
                                        selectedTextColor = Teal800,
                                        indicatorColor = Teal100,
                                        unselectedIconColor = Slate600,
                                        unselectedTextColor = Slate600
                                    )
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        NavHost(
                            navController = navController,
                            startDestination = Screen.Dashboard.route
                        ) {
                            composable(Screen.Login.route) {
                                LoginScreen(
                                    repository = repository,
                                    onLoginSuccess = {
                                        navController.navigate(Screen.Dashboard.route) {
                                            popUpTo(Screen.Login.route) { inclusive = true }
                                        }
                                    }
                                )
                            }

                            composable(Screen.Dashboard.route) {
                                DashboardScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Cashier.route) {
                                CashierScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.SalesHistory.route) {
                                SalesHistoryScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Prescription.route) {
                                PrescriptionScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Counseling.route) {
                                CounselingScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Purchase.route) {
                                PurchaseScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.PurchaseOrder.route) {
                                PurchaseOrderScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Stock.route) {
                                StockScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.MasterData.route) {
                                MasterDataScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.Reports.route) {
                                ReportsScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }

                            composable(Screen.UsersAndSettings.route) {
                                UsersAndSettingsScreen(
                                    repository = repository,
                                    onNavigateTo = { screen ->
                                        navController.navigate(screen.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    onMenuClick = {
                                        scope.launch { drawerState.open() }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // ==================== BOTTOM SHEET: MENU SEMUA MODUL ====================
    if (showMenuBottomSheet) {
        ModalBottomSheet(
            onDismissRequest = { showMenuBottomSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            dragHandle = { BottomSheetDefaults.DragHandle() }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Profile & Role Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Teal50, RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Teal600),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.LocalPharmacy, contentDescription = null, tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = currentUser?.name ?: "Pengguna Apotek",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Teal950
                        )
                        Text(
                            text = "Akses Role: ${currentUser?.role ?: "-"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Teal700
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))
                Text(
                    text = "Semua Fitur & Modul",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Slate700
                )
                Spacer(modifier = Modifier.height(10.dp))

                // Grid Modul dengan Touch Target Nyaman (Min 48dp) & Tactile Feedback
                val chunkedItems = allNavItems.chunked(2)
                chunkedItems.forEach { rowItems ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        rowItems.forEach { (screen, icon, title) ->
                            val isSelected = currentRoute == screen.route
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) Teal100 else Slate100
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .heightIn(min = 58.dp)
                                    .bounceClick {
                                        showMenuBottomSheet = false
                                        navController.navigate(screen.route) {
                                            popUpTo(Screen.Dashboard.route)
                                            launchSingleTop = true
                                        }
                                    }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (isSelected) Teal600 else Color.White),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = icon,
                                            contentDescription = null,
                                            tint = if (isSelected) Color.White else Teal700,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = title,
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                        color = if (isSelected) Teal900 else Slate800,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                        if (rowItems.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Slate200)
                Spacer(modifier = Modifier.height(12.dp))

                // Tombol Logout / Ganti Akun dengan touch target 50dp & bounce feedback
                Button(
                    onClick = {
                        showMenuBottomSheet = false
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Rose100,
                        contentColor = Rose600
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .tactilePress()
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Keluar / Ganti Pengguna",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

