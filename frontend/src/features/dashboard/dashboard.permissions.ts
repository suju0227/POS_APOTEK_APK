import type { RoleName } from '../auth/auth.types';

export function canViewProfit(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK';
}

export function canViewManagerDashboard(role: RoleName | undefined) {
  return role === 'MANAGER';
}

export function canViewOperationalDashboard(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK' || role === 'APOTEKER';
}

export function canViewRevenue(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK';
}

export function canViewRecentSales(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK';
}

export function canViewTransactionSummary(role: RoleName | undefined) {
  return role === 'KASIR' || role === 'MANAGER' || role === 'PEMILIK';
}

export function canViewStockSummary(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK' || role === 'APOTEKER' || role === 'KASIR';
}

export function canViewExpiringBatches(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'PEMILIK' || role === 'APOTEKER';
}

export function canViewPurchaseOrderSummary(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'APOTEKER';
}

export function canViewPrescriptionSummary(role: RoleName | undefined) {
  return role === 'MANAGER' || role === 'APOTEKER';
}

export function canViewAuditSummary(role: RoleName | undefined) {
  return role === 'MANAGER';
}

export function canViewCashierShortcut(role: RoleName | undefined) {
  return role === 'KASIR';
}
