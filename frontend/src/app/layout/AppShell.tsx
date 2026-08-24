import {
  Archive,
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  FilePlus2,
  HeartHandshake,
  History,
  Home,
  LogOut,
  Menu,
  Package,
  Pill,
  Receipt,
  RotateCcw,
  Scale,
  Scroll,
  Settings,
  Share2,
  ShoppingBag,
  Tags,
  TrendingUp,
  Truck,
  UserCog,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';
import type { RoleName } from '../../features/auth/auth.types';
import { Button } from '../../shared/components/Button';
import { ConnectionStatusIndicator } from '../../shared/components/ConnectionStatusIndicator';
import { useConnectionStatus } from '../../shared/hooks/useConnectionStatus';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: RoleName[];
};

type NavGroup = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Utama',
    icon: Home,
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: Home,
        roles: ['APOTEKER', 'MANAGER', 'PEMILIK'],
      },
      { label: 'Kasir', path: '/kasir', icon: Receipt, roles: ['KASIR', 'MANAGER'] },
    ],
  },
  {
    label: 'Transaksi',
    icon: History,
    items: [
      {
        label: 'Riwayat Transaksi',
        path: '/riwayat-transaksi',
        icon: History,
        roles: ['KASIR', 'MANAGER'],
      },
      {
        label: 'Retur Penjualan',
        path: '/retur-penjualan',
        icon: RotateCcw,
        roles: ['KASIR', 'MANAGER'],
      },
    ],
  },
  {
    label: 'Pelayanan',
    icon: Pill,
    items: [
      {
        label: 'Resep',
        path: '/pelayanan/resep',
        icon: Pill,
        roles: ['APOTEKER', 'MANAGER'],
      },
      {
        label: 'Konseling',
        path: '/pelayanan/konseling',
        icon: HeartHandshake,
        roles: ['APOTEKER', 'MANAGER'],
      },
    ],
  },
  {
    label: 'Master Data',
    icon: Package,
    items: [
      { label: 'Produk', path: '/produk', icon: Package, roles: ['MANAGER'] },
      { label: 'Kategori', path: '/kategori', icon: Tags, roles: ['MANAGER'] },
      { label: 'Satuan', path: '/satuan', icon: Scale, roles: ['MANAGER'] },
      { label: 'Supplier', path: '/supplier', icon: Truck, roles: ['MANAGER'] },
    ],
  },
  {
    label: 'Stok',
    icon: Archive,
    items: [
      { label: 'Batch', path: '/batch', icon: Calendar, roles: ['MANAGER'] },
      { label: 'Stok', path: '/stok', icon: Archive, roles: ['MANAGER'] },
      { label: 'Mutasi Stok', path: '/mutasi-stok', icon: ArrowLeftRight, roles: ['MANAGER'] },
    ],
  },
  {
    label: 'Pembelian',
    icon: ShoppingBag,
    items: [
      { label: 'Pemesanan', path: '/pemesanan', icon: FilePlus2, roles: ['APOTEKER', 'MANAGER'] },
      { label: 'Pembelian', path: '/pembelian', icon: ShoppingBag, roles: ['MANAGER'] },
      { label: 'Retur Pembelian', path: '/retur-pembelian', icon: RotateCcw, roles: ['MANAGER'] },
    ],
  },
  {
    label: 'Laporan',
    icon: TrendingUp,
    items: [
      {
        label: 'Laporan Penjualan',
        path: '/laporan/penjualan',
        icon: TrendingUp,
        roles: ['MANAGER'],
      },
      {
        label: 'Laporan Laba',
        path: '/laporan/laba',
        icon: Coins,
        roles: ['MANAGER'],
      },
      { label: 'Export', path: '/export', icon: Share2, roles: ['MANAGER'] },
    ],
  },
  {
    label: 'Admin',
    icon: UserCog,
    items: [
      { label: 'Users', path: '/users', icon: UserCog, roles: ['MANAGER'] },
      { label: 'Audit Log', path: '/audit-log', icon: Scroll, roles: ['MANAGER'] },
      { label: 'Settings', path: '/settings', icon: Settings, roles: ['MANAGER'] },
    ],
  },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((group) => [group.label, true])),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const connection = useConnectionStatus();
  const allowedGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (user ? item.roles.includes(user.role) : false)),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const isItemActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-slate-50/50 bg-grid-pattern text-slate-900">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white/50 text-slate-600 hover:bg-slate-50 transition active:scale-95"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white/50 text-slate-600 hover:bg-slate-50 transition active:scale-95"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatusIndicator status={connection.status} />
          <div className="text-sm font-bold tracking-tight text-gradient">POS Apotek</div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-slate-200/50 bg-linear-to-b from-white to-slate-50/50 transition-all duration-300 ease-out lg:translate-x-0 ${
          collapsed ? 'w-20' : 'w-72'
        } ${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          {collapsed ? (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-heading font-black text-sm tracking-tighter shadow-xs">
              AR
            </div>
          ) : (
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-gradient truncate">POS Apotek Risyah</div>
              <div className="inline-flex rounded-full bg-teal-500/8 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-700 uppercase border border-teal-500/10 mt-0.5">
                {user?.role}
              </div>
            </div>
          )}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition active:scale-95 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex h-[calc(100vh-4.25rem)] flex-col gap-3.5 overflow-y-auto p-4 scrollbar-thin">
          <div className="space-y-3">
            {allowedGroups.map((group) => {
              const isGroupActive = group.items.some((item) => isItemActive(item.path));

              if (collapsed) {
                const GroupIcon = group.icon || Home;
                return (
                  <div key={group.label} className="relative group/nav-item flex justify-center">
                    <button
                      type="button"
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                        isGroupActive
                          ? 'border-teal-500/15 bg-teal-500/8 text-teal-700 shadow-xs'
                          : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={group.label}
                    >
                      <GroupIcon size={20} />
                    </button>

                    <div className="absolute left-14 top-0 z-50 hidden group-hover/nav-item:block w-56 rounded-xl border border-slate-200/60 bg-white/95 p-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1.5">
                        {group.label}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = isItemActive(item.path);
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                                isActive
                                  ? 'bg-teal-50/60 text-teal-700 font-semibold ring-1 ring-teal-500/10'
                                  : 'text-slate-600 hover:bg-slate-50/50 hover:text-slate-900'
                              }`}
                            >
                              <Icon size={16} className="shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={group.label}
                  className={`rounded-xl border transition-all duration-200 ${
                    isGroupActive
                      ? 'border-teal-500/10 bg-teal-500/5 shadow-xs'
                      : 'border-transparent'
                  }`}
                >
                  <button
                    type="button"
                    className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3.5 text-left text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
                      isGroupActive
                        ? 'text-teal-700'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={openGroups[group.label]}
                    aria-label={`Buka/tutup grup ${group.label}`}
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform duration-200 ${
                        openGroups[group.label] ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                  {openGroups[group.label] ? (
                    <div className="space-y-0.5 px-1.5 pb-2.5 pt-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                                isActive
                                  ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-500/10 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50/50 hover:text-slate-900'
                              }`
                            }
                          >
                            <Icon size={18} className="shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-auto border-t border-slate-100 pt-4 px-1">
            {collapsed ? (
              <div className="flex flex-col items-center">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-xs font-bold text-white shadow-xs uppercase tracking-wider"
                  title={`${user?.name} (${user?.username})`}
                >
                  {user?.name?.substring(0, 2) || 'US'}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLogout}
                  className="!h-9 !w-9 !p-0 mt-3 flex items-center justify-center active:scale-95"
                  title="Keluar Sesi"
                >
                  <LogOut size={14} />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 px-1.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-xs font-bold text-white shadow-xs uppercase tracking-wider">
                    {user?.name?.substring(0, 2) || 'US'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800 tracking-tight">{user?.name}</div>
                    <div className="truncate text-[10px] text-slate-400 font-medium">{user?.username}</div>
                  </div>
                </div>
                <Button type="button" variant="secondary" fullWidth onClick={handleLogout} className="!h-9 text-xs gap-1.5">
                  <LogOut size={14} />
                  Keluar Sesi
                </Button>
              </>
            )}
          </div>
        </nav>
      </aside>

      <main className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-slate-200/40 bg-white/80 px-6 backdrop-blur-md lg:flex">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition active:scale-95"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <ConnectionStatusIndicator status={connection.status} />
        </div>
        {connection.isOffline ? (
          <div className="sticky top-14 z-20 border-b border-red-200 bg-red-50/90 px-4 py-2.5 text-sm font-semibold text-red-700 backdrop-blur-xs lg:px-8">
            Koneksi Terputus: Server lokal tidak terhubung. Periksa jaringan Anda.
          </div>
        ) : null}
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
