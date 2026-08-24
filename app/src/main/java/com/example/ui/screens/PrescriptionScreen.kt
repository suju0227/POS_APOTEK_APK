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
import com.example.data.repository.PrescriptionItemInput
import com.example.ui.components.*
import com.example.ui.navigation.Screen
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun PrescriptionScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allPrescriptions by repository.allPrescriptions.collectAsState(initial = emptyList())
    val allProducts by repository.allProducts.collectAsState(initial = emptyList())
    val allProductUnits by repository.allProductUnits.collectAsState(initial = emptyList())
    val allUnits by repository.allUnits.collectAsState(initial = emptyList())

    val unitsMap = remember(allUnits) { allUnits.associateBy { it.id } }
    val productUnitsMap = remember(allProductUnits) { allProductUnits.groupBy { it.productId } }

    var showCreateDialog by remember { mutableStateOf(false) }
    var selectedPrescription by remember { mutableStateOf<PrescriptionEntity?>(null) }
    var prescriptionItems by remember { mutableStateOf<List<PrescriptionItemEntity>>(emptyList()) }
    var showDetailDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Pelayanan Resep Dokter",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick,
                actions = {
                    IconButton(onClick = { onNavigateTo(Screen.Counseling) }) {
                        Icon(Icons.Default.VolunteerActivism, contentDescription = "Konseling Pasien", tint = Color.White)
                    }
                }
            )
        },
        floatingActionButton = {
            if (currentUser?.role in listOf("APOTEKER", "MANAGER")) {
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Indigo500,
                    contentColor = Color.White,
                    modifier = Modifier.tactilePress()
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Buat Resep Baru")
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Slate50),
            contentAlignment = Alignment.TopCenter
        ) {
            if (allPrescriptions.isEmpty()) {
                EmptyStateView(
                    title = "Belum Ada Resep Dokter",
                    description = "Tekan tombol + untuk mencatat resep masuk baru.",
                    icon = Icons.Default.MedicalServices
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .widthIn(max = 860.dp),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(allPrescriptions) { presc ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .bounceClick {
                                    selectedPrescription = presc
                                    coroutineScope.launch {
                                        prescriptionItems = repository.getPrescriptionItems(presc.id)
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
                                        .size(46.dp)
                                        .clip(CircleShape)
                                        .background(
                                            when (presc.status) {
                                                "PAID" -> Emerald100
                                                "READY_FOR_PAYMENT" -> Indigo100
                                                else -> Amber100
                                            }
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.MedicalServices,
                                        contentDescription = null,
                                        tint = when (presc.status) {
                                            "PAID" -> Emerald700
                                            "READY_FOR_PAYMENT" -> Indigo500
                                            else -> Amber500
                                        },
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = presc.prescriptionNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate800
                                    )
                                    Text(
                                        text = "Pasien: ${presc.patientName}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Slate700
                                    )
                                    Text(
                                        text = "Dokter: ${presc.doctorName ?: "-"} • Apoteker: ${presc.pharmacistName}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate500
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    StatusBadge(
                                        text = when (presc.status) {
                                            "READY_FOR_PAYMENT" -> "Siap Bayar di Kasir"
                                            "PAID" -> "Lunas / Selesai"
                                            "CANCELLED" -> "Dibatalkan"
                                            else -> "Draft Apoteker"
                                        },
                                        containerColor = when (presc.status) {
                                            "READY_FOR_PAYMENT" -> Indigo100
                                            "PAID" -> Emerald100
                                            else -> Amber100
                                        },
                                        contentColor = when (presc.status) {
                                            "READY_FOR_PAYMENT" -> Indigo500
                                            "PAID" -> Emerald700
                                            else -> Amber500
                                        }
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
    if (showDetailDialog && selectedPrescription != null) {
        val presc = selectedPrescription!!
        AlertDialog(
            onDismissRequest = { showDetailDialog = false },
            title = {
                Text("Detail Resep ${presc.prescriptionNumber}", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 380.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Pasien: ${presc.patientName} (${presc.patientPhone ?: "-"})", style = MaterialTheme.typography.bodyMedium)
                    Text("Dokter: ${presc.doctorName ?: "-"}", style = MaterialTheme.typography.bodySmall)
                    Text("Apoteker: ${presc.pharmacistName}", style = MaterialTheme.typography.bodySmall)
                    if (!presc.note.isNullOrBlank()) {
                        Text("Catatan Klinis: ${presc.note}", style = MaterialTheme.typography.bodySmall, color = Slate600)
                    }
                    Divider(modifier = Modifier.padding(vertical = 4.dp))
                    Text("Obat & Aturan Pakai (Signa):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)

                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(prescriptionItems) { item ->
                            Card(
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = Slate50),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(8.dp)) {
                                    Text(item.productName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                    Text("Jumlah: ${item.qtySaleUnit.toInt()} ${item.unitName}", style = MaterialTheme.typography.labelSmall)
                                    Text("Aturan: ${item.instruction}", style = MaterialTheme.typography.labelSmall, color = Teal700, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (presc.status == "DRAFT" && currentUser?.role in listOf("APOTEKER", "MANAGER")) {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                repository.updatePrescriptionStatus(presc.id, "READY_FOR_PAYMENT")
                                showDetailDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                    ) {
                        Text("Kirim ke Kasir (Siap Bayar)")
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

    // Create Prescription Dialog
    if (showCreateDialog) {
        var patientName by remember { mutableStateOf("") }
        var patientPhone by remember { mutableStateOf("") }
        var doctorName by remember { mutableStateOf("") }
        var clinicalNote by remember { mutableStateOf("") }
        var itemsInput by remember { mutableStateOf<List<PrescriptionItemInput>>(emptyList()) }

        var selectedProdId by remember { mutableStateOf(allProducts.firstOrNull()?.id ?: "") }
        var selectedQty by remember { mutableStateOf("1") }
        var signaInstruction by remember { mutableStateOf("3 x 1 tablet sesudah makan") }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = {
                Text("Buat Resep Pasien Baru", fontWeight = FontWeight.Bold)
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 440.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        OutlinedTextField(
                            value = patientName,
                            onValueChange = { patientName = it },
                            label = { Text("Nama Pasien") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = doctorName,
                            onValueChange = { doctorName = it },
                            label = { Text("Nama Dokter Peresep") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = clinicalNote,
                            onValueChange = { clinicalNote = it },
                            label = { Text("Catatan / Diagnosa Singkat") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        Divider()
                        Text("Tambah Obat ke Resep:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    }

                    item {
                        // Product Picker
                        Text("Pilih Obat:", style = MaterialTheme.typography.bodySmall)
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
                        OutlinedTextField(
                            value = signaInstruction,
                            onValueChange = { signaInstruction = it },
                            label = { Text("Aturan Pakai (Signa)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        Button(
                            onClick = {
                                val prod = allProducts.find { it.id == selectedProdId }
                                val pUnits = productUnitsMap[selectedProdId] ?: emptyList()
                                val defaultUnit = pUnits.firstOrNull()
                                val uName = defaultUnit?.let { unitsMap[it.unitId]?.name } ?: "Unit"

                                if (prod != null && defaultUnit != null) {
                                    itemsInput = itemsInput + PrescriptionItemInput(
                                        productId = prod.id,
                                        productName = prod.name,
                                        productUnitId = defaultUnit.id,
                                        unitName = uName,
                                        qty = selectedQty.toDoubleOrNull() ?: 1.0,
                                        instruction = signaInstruction
                                    )
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Tambahkan Obat Ini")
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
                                    Text("${item.qty.toInt()} ${item.unitName} • ${item.instruction}", style = MaterialTheme.typography.labelSmall, color = Slate600)
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
                        coroutineScope.launch {
                            repository.createPrescription(
                                pharmacistId = currentUser?.id ?: "u_apoteker",
                                pharmacistName = currentUser?.name ?: "Apoteker",
                                patientName = patientName.ifBlank { "Pasien Umum" },
                                patientPhone = patientPhone.ifBlank { null },
                                doctorName = doctorName.ifBlank { "dr. Umum" },
                                note = clinicalNote.ifBlank { null },
                                items = itemsInput
                            )
                            showCreateDialog = false
                        }
                    },
                    enabled = itemsInput.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                ) {
                    Text("Simpan Resep")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}
