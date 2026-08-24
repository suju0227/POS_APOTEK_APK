import { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Input } from '../../shared/components/Input';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToastStore } from '../../shared/components/toast.store';
import { formatDateTimeWita } from '../../shared/utils/formatters';
import type { RoleName } from '../auth/auth.types';
import type { CreateUserPayload, UserRow } from './users.types';
import { useCreateUser, useDeactivateUser, useUpdateUser, useUsers } from './users.hooks';

const initialForm: CreateUserPayload = {
  name: '',
  username: '',
  email: '',
  password: '',
  roleName: 'KASIR',
};

export function UsersPage() {
  const { data = [], isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState<CreateUserPayload>(initialForm);

  const handleCreate = async () => {
    const name = form.name.trim();
    const username = form.username.trim();
    const email = form.email?.trim();
    const password = form.password.trim();

    if (!name || !username || !password) {
      showToast('Nama, username, dan password awal wajib diisi.');
      return;
    }
    if (password.length < 6) {
      showToast('Password awal minimal 6 karakter.');
      return;
    }

    try {
      await createUser.mutateAsync({
        ...form,
        name,
        username,
        email: email || undefined,
        password,
      });
      setForm(initialForm);
      showToast('User berhasil dibuat.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleRoleChange = async (user: UserRow, roleName: RoleName) => {
    try {
      await updateUser.mutateAsync({ id: user.id, payload: { roleName } });
      showToast('Role user berhasil diperbarui.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleStatusToggle = async (user: UserRow) => {
    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(user.id);
        showToast('User berhasil dinonaktifkan.');
      } else {
        await updateUser.mutateAsync({ id: user.id, payload: { isActive: true } });
        showToast('User berhasil diaktifkan.');
      }
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Manajemen User</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manager dapat membuat akun operasional, mengubah role, dan menonaktifkan akun
          tanpa menghapus histori transaksi.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-950">Tambah User</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Input
            label="Nama"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label="Username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <Input
            label="Password awal"
            type="password"
            minLength={6}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={form.roleName}
              onChange={(event) =>
                setForm({ ...form, roleName: event.target.value as RoleName })
              }
            >
              <option value="KASIR">KASIR</option>
              <option value="APOTEKER">APOTEKER</option>
              <option value="MANAGER">MANAGER</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" onClick={handleCreate} disabled={createUser.isPending}>
              {createUser.isPending ? 'Menyimpan...' : 'Simpan User'}
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Role menentukan akses menu dan endpoint backend. Kasir tetap tidak menerima akses
          harga modal, HPP, laba, pembelian, koreksi stok, atau laporan laba.
        </p>
      </Card>

      {!data.length ? (
        <EmptyState title="Belum ada user" />
      ) : (
        <DataTable<UserRow & Record<string, unknown>>
          data={data as (UserRow & Record<string, unknown>)[]}
          columns={[
            { key: 'name', header: 'Nama' },
            { key: 'username', header: 'Username' },
            { key: 'email', header: 'Email' },
            {
              key: 'role',
              header: 'Role',
              render: (row) => (
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={row.role}
                  onChange={(event) => handleRoleChange(row, event.target.value as RoleName)}
                >
                  <option value="KASIR">KASIR</option>
                  <option value="APOTEKER">APOTEKER</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              ),
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (row.isActive ? 'Aktif' : 'Nonaktif'),
            },
            {
              key: 'lastLoginAt',
              header: 'Login Terakhir',
              render: (row) =>
                row.lastLoginAt ? formatDateTimeWita(row.lastLoginAt) : '-',
            },
            {
              key: 'actions',
              header: 'Aksi',
              render: (row) => (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleStatusToggle(row)}
                  disabled={deactivateUser.isPending || updateUser.isPending}
                >
                  {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
