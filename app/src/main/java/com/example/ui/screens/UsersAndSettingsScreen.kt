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
fun UsersAndSettingsScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allUsers by repository.allUsers.collectAsState(initial = emptyList())
    val appSettings by repository.appSettings.collectAsState(initial = null)
    val allAuditLogs by repository.allAuditLogs.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) }
    var showAddUserDialog by remember { mutableStateOf(false) }

    // Settings Form
    var pharmacyName by remember { mutableStateOf(appSettings?.pharmacyName ?: "Apotek Risyah") }
    var pharmacyAddress by remember { mutableStateOf(appSettings?.address ?: "Jl. Poros Rappang - Pinrang Km. 3, Sidrap") }
    var pharmacyPhone by remember { mutableStateOf(appSettings?.phone ?: "0812-4567-8910") }
    var expiredDaysAlert by remember { mutableStateOf((appSettings?.expiredAlertDays ?: 90).toString()) }

    LaunchedEffect(appSettings) {
        appSettings?.let {
            pharmacyName = it.pharmacyName
            pharmacyAddress = it.address ?: ""
            pharmacyPhone = it.phone ?: ""
            expiredDaysAlert = it.expiredAlertDays.toString()
        }
    }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Pengaturan & Audit Sistem",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick
            )
        },
        floatingActionButton = {
            if (selectedTab == 0 && currentUser?.role == "MANAGER") {
                FloatingActionButton(
                    onClick = { showAddUserDialog = true },
                    containerColor = Teal600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = "Tambah Pengguna")
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
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Teal600
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Pengguna (${allUsers.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Profil Apotek", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("Audit Trail (${allAuditLogs.size})", fontWeight = FontWeight.Bold) }
                )
            }

            when (selectedTab) {
                0 -> {
                    // Users List
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(allUsers) { user ->
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
                                        Icon(
                                            imageVector = when (user.role) {
                                                "MANAGER" -> Icons.Default.AdminPanelSettings
                                                "KASIR" -> Icons.Default.PointOfSale
                                                "APOTEKER" -> Icons.Default.MedicalServices
                                                else -> Icons.Default.Visibility
                                            },
                                            contentDescription = null,
                                            tint = Teal600,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(user.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                        Text("Username: ${user.username}", style = MaterialTheme.typography.bodySmall, color = Slate600)
                                    }
                                    StatusBadge(
                                        text = user.role,
                                        containerColor = when (user.role) {
                                            "MANAGER" -> Emerald50
                                            "APOTEKER" -> Indigo100
                                            "KASIR" -> Teal50
                                            else -> Slate100
                                        },
                                        contentColor = when (user.role) {
                                            "MANAGER" -> Emerald700
                                            "APOTEKER" -> Indigo500
                                            "KASIR" -> Teal700
                                            else -> Slate700
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // Pharmacy Settings Form
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Text("Informasi Struk & Identitas Apotek", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    OutlinedTextField(
                                        value = pharmacyName,
                                        onValueChange = { pharmacyName = it },
                                        label = { Text("Nama Apotek") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    OutlinedTextField(
                                        value = pharmacyAddress,
                                        onValueChange = { pharmacyAddress = it },
                                        label = { Text("Alamat Apotek") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    OutlinedTextField(
                                        value = pharmacyPhone,
                                        onValueChange = { pharmacyPhone = it },
                                        label = { Text("Nomor Telepon / WhatsApp") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    OutlinedTextField(
                                        value = expiredDaysAlert,
                                        onValueChange = { expiredDaysAlert = it },
                                        label = { Text("Batas Peringatan Kedaluwarsa (Hari)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    Surface(
                                        color = Slate50,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "Zona Waktu Sistem: Asia/Makassar (WITA)\nMata Uang: Rupiah (IDR)",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Slate600,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }

                                    if (currentUser?.role == "MANAGER") {
                                        Button(
                                            onClick = {
                                                coroutineScope.launch {
                                                    repository.saveSettings(
                                                        AppSettingEntity(
                                                            id = appSettings?.id ?: "default_settings",
                                                            pharmacyName = pharmacyName,
                                                            address = pharmacyAddress,
                                                            phone = pharmacyPhone,
                                                            expiredAlertDays = expiredDaysAlert.toIntOrNull() ?: 90,
                                                            timezone = "Asia/Makassar",
                                                            currency = "IDR"
                                                        )
                                                    )
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("Simpan Pengaturan")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                2 -> {
                    // Audit Logs
                    if (allAuditLogs.isEmpty()) {
                        EmptyStateView(
                            title = "Belum Ada Catatan Audit",
                            description = "Aktivitas login, transaksi, dan perubahan data otomatis tercatat.",
                            icon = Icons.Default.HistoryEdu
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(allAuditLogs) { log ->
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(log.action, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = Teal800)
                                            Text(formatDateTime(log.createdAt), style = MaterialTheme.typography.labelSmall, color = Slate400)
                                        }
                                        Text(log.details, style = MaterialTheme.typography.bodySmall, color = Slate700, modifier = Modifier.padding(vertical = 2.dp))
                                        Text("Oleh: ${log.userName ?: "System"} • Tipe: ${log.entityType}", style = MaterialTheme.typography.labelSmall, color = Slate500)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddUserDialog) {
        var newUsername by remember { mutableStateOf("") }
        var newName by remember { mutableStateOf("") }
        var newPin by remember { mutableStateOf("1234") }
        var newRole by remember { mutableStateOf("KASIR") }

        AlertDialog(
            onDismissRequest = { showAddUserDialog = false },
            title = { Text("Tambah Pengguna Sistem", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Nama Lengkap") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = newUsername, onValueChange = { newUsername = it }, label = { Text("Username") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = newPin, onValueChange = { newPin = it }, label = { Text("PIN Sandi") }, modifier = Modifier.fillMaxWidth())
                    Text("Role:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    listOf("KASIR", "APOTEKER", "MANAGER", "PEMILIK").forEach { roleOpt ->
                        Surface(
                            color = if (newRole == roleOpt) Teal50 else Slate50,
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp)
                                .clickable { newRole = roleOpt }
                        ) {
                            Text(
                                text = roleOpt,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = if (newRole == roleOpt) FontWeight.Bold else FontWeight.Normal,
                                color = if (newRole == roleOpt) Teal800 else Slate800,
                                modifier = Modifier.padding(6.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newUsername.isNotBlank() && newName.isNotBlank()) {
                            coroutineScope.launch {
                                repository.saveUser(
                                    UserEntity(
                                        id = "u_${UUID.randomUUID()}",
                                        role = newRole,
                                        name = newName,
                                        username = newUsername.trim().lowercase(),
                                        pin = newPin.trim()
                                    )
                                )
                                showAddUserDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) { Text("Simpan Pengguna") }
            },
            dismissButton = { TextButton(onClick = { showAddUserDialog = false }) { Text("Batal") } }
        )
    }
}
