import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PlaceholderPage } from '../shared/components/PlaceholderPage';
import { ToastRegion } from '../shared/components/ToastRegion';
import { AuditLogsPage } from '../features/audit-logs/AuditLogsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { BatchPage } from '../features/batches/BatchPage';
import { CashierPage } from '../features/cashier/CashierPage';
import { CounselingPage } from '../features/counseling/CounselingPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ExportPage } from '../features/exports/ExportPage';
import {
  CategoriesPage,
  ProductsPage,
  SuppliersPage,
  UnitsPage,
} from '../features/master-data/MasterDataPages';
import { PurchaseOrderPage } from '../features/purchase-orders/PurchaseOrderPage';
import { PurchaseReturnPage } from '../features/purchase-returns/PurchaseReturnPage';
import { PurchasePage } from '../features/purchases/PurchasePage';
import { PrescriptionPage } from '../features/prescriptions/PrescriptionPage';
import { ProfitReportPage } from '../features/reports/ProfitReportPage';
import { SalesReportPage } from '../features/reports/SalesReportPage';
import { SalesHistoryPage } from '../features/sales-history/SalesHistoryPage';
import { SalesReturnPage } from '../features/sales-returns/SalesReturnPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { StockMutationsPage } from '../features/stock/StockMutationsPage';
import { StockPage } from '../features/stock/StockPage';
import { UsersPage } from '../features/users/UsersPage';
import type { RoleName } from '../features/auth/auth.types';

const managerOnly: RoleName[] = ['MANAGER'];
const dashboardRoles: RoleName[] = ['KASIR', 'APOTEKER', 'MANAGER', 'PEMILIK'];
const cashierAndManager: RoleName[] = ['KASIR', 'MANAGER'];
const pharmacistAndManager: RoleName[] = ['APOTEKER', 'MANAGER'];

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={dashboardRoles}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute allowedRoles={cashierAndManager}>
                <CashierPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/riwayat-transaksi"
            element={
              <ProtectedRoute allowedRoles={cashierAndManager}>
                <SalesHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/retur-penjualan"
            element={
              <ProtectedRoute allowedRoles={cashierAndManager}>
                <SalesReturnPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produk"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kategori"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <SuppliersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/satuan"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <UnitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/batch"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <BatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pemesanan"
            element={
              <ProtectedRoute allowedRoles={pharmacistAndManager}>
                <PurchaseOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelayanan/resep"
            element={
              <ProtectedRoute allowedRoles={pharmacistAndManager}>
                <PrescriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelayanan/konseling"
            element={
              <ProtectedRoute allowedRoles={pharmacistAndManager}>
                <CounselingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pembelian"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <PurchasePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pembelian/dari-po/:poId"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <PurchasePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stok"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <StockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mutasi-stok"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <StockMutationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/retur-pembelian"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <PurchaseReturnPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <ExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laporan/penjualan"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <SalesReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laporan/laba"
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <ProfitReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<PlaceholderPage title="Halaman tidak ditemukan" />}
          />
        </Route>
      </Routes>
      <ToastRegion />
    </>
  );
}
