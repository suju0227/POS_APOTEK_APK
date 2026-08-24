package com.example.ui.navigation

sealed class Screen(val route: String, val title: String) {
    object Login : Screen("login", "Login")
    object Dashboard : Screen("dashboard", "Dashboard")
    object Cashier : Screen("cashier", "Kasir / Transaksi")
    object SalesHistory : Screen("sales_history", "Riwayat Transaksi")
    object SalesReturn : Screen("sales_return", "Retur Penjualan")
    object Prescription : Screen("prescription", "Pelayanan Resep")
    object Counseling : Screen("counseling", "Konseling Pasien")
    object PurchaseOrder : Screen("purchase_order", "Pemesanan Obat (PO)")
    object Purchase : Screen("purchase", "Pembelian Supplier")
    object Stock : Screen("stock", "Stok & Batch")
    object StockMutation : Screen("stock_mutation", "Mutasi Stok")
    object MasterData : Screen("master_data", "Master Data")
    object Reports : Screen("reports", "Laporan & Laba")
    object UsersAndSettings : Screen("settings", "Pengguna & Pengaturan")
}
