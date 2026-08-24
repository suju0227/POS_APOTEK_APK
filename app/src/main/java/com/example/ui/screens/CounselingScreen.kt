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
import kotlinx.coroutines.launch

@Composable
fun CounselingScreen(
    repository: PharmacyRepository,
    onNavigateTo: (Screen) -> Unit,
    onMenuClick: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val currentUser by repository.currentUser.collectAsState()
    val allCounseling by repository.allCounselingRecords.collectAsState(initial = emptyList())

    var showDialog by remember { mutableStateOf(false) }
    var patientName by remember { mutableStateOf("") }
    var educationSummary by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            AppHeader(
                title = "Pelayanan Konseling Informasi Obat",
                currentRole = currentUser?.role,
                currentUserName = currentUser?.name,
                onMenuClick = onMenuClick
            )
        },
        floatingActionButton = {
            if (currentUser?.role in listOf("APOTEKER", "MANAGER")) {
                FloatingActionButton(
                    onClick = { showDialog = true },
                    containerColor = Teal600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Catat Konseling")
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
            if (allCounseling.isEmpty()) {
                EmptyStateView(
                    title = "Belum Ada Catatan Konseling",
                    description = "Catat edukasi pemakaian obat dan konseling pasien di sini.",
                    icon = Icons.Default.VolunteerActivism
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(allCounseling) { record ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(Teal50),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(Icons.Default.Person, contentDescription = null, tint = Teal600, modifier = Modifier.size(20.dp))
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                text = record.patientName,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Slate800
                                            )
                                            Text(
                                                text = "Apoteker: ${record.pharmacistName}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Slate500
                                            )
                                        }
                                    }
                                    Text(
                                        text = formatDateTime(record.counselingDate),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Slate400
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Surface(
                                    color = Slate50,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Text(
                                            text = "Ringkasan Edukasi / PTO (Pemantauan Terapi Obat):",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Teal800
                                        )
                                        Text(
                                            text = record.educationSummary,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Slate700,
                                            modifier = Modifier.padding(top = 2.dp)
                                        )
                                        if (!record.note.isNullOrBlank()) {
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "Catatan: ${record.note}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Slate500
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

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Catat Konseling Informasi Obat", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = patientName,
                        onValueChange = { patientName = it },
                        label = { Text("Nama Pasien / Keluarga") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = educationSummary,
                        onValueChange = { educationSummary = it },
                        label = { Text("Edukasi (Cara Minum, Waktu, Efek Samping)") },
                        modifier = Modifier.fillMaxWidth().height(100.dp)
                    )
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        label = { Text("Catatan Tindak Lanjut") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            repository.createCounselingRecord(
                                pharmacistId = currentUser?.id ?: "u_apoteker",
                                pharmacistName = currentUser?.name ?: "Apoteker",
                                prescriptionId = null,
                                saleId = null,
                                patientName = patientName.ifBlank { "Pasien" },
                                educationSummary = educationSummary.ifBlank { "Pemberian informasi obat lengkap" },
                                note = note.ifBlank { null }
                            )
                            patientName = ""
                            educationSummary = ""
                            note = ""
                            showDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Text("Simpan Konseling")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) { Text("Batal") }
            }
        )
    }
}
