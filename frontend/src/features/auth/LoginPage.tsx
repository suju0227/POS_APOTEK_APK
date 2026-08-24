import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../../shared/api/apiClient';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { useToastStore } from '../../shared/components/toast.store';
import { useAuthStore } from './auth.store';
import type { LoginResponse, RoleName } from './auth.types';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username atau email wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const defaultPathByRole: Record<RoleName, string> = {
  KASIR: '/kasir',
  APOTEKER: '/pelayanan/resep',
  MANAGER: '/dashboard',
  PEMILIK: '/dashboard',
};

const allowedPathPrefixesByRole: Record<RoleName, string[]> = {
  KASIR: ['/kasir', '/riwayat-transaksi', '/retur-penjualan'],
  APOTEKER: ['/dashboard', '/pelayanan/resep', '/pelayanan/konseling', '/pemesanan'],
  MANAGER: ['/'],
  PEMILIK: ['/dashboard'],
};

function resolvePostLoginPath(role: RoleName, requestedPath: string) {
  const allowedPrefixes = allowedPathPrefixesByRole[role];
  const isAllowed = allowedPrefixes.some((path) =>
    path === '/' ? true : requestedPath.startsWith(path),
  );

  return isAllowed ? requestedPath : defaultPathByRole[role];
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore((state) => state.show);
  const { accessToken, user, setSession } = useAuthStore();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
    },
  });

  if (accessToken && user) {
    return <Navigate to={resolvePostLoginPath(user.role, from)} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await apiClient.post<LoginResponse>('/auth/login', values);
      setSession(session);
      toast('Login berhasil');
      navigate(resolvePostLoginPath(session.user.role, from), { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Login gagal');
    }
  });

  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-50/50 bg-grid-pattern px-4 py-12 overflow-hidden select-none">
      {/* Background Glowing Blurs */}
      <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl animate-float-delayed pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md border border-slate-200/40 bg-white/90 shadow-xl shadow-slate-100/50 backdrop-blur-md rounded-2xl p-8 sm:p-10 transition-all duration-300">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md font-heading font-black text-xl tracking-tighter">
            AR
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
            POS Apotek Risyah
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Masuk untuk mengakses area kerja sesuai role Anda.
          </p>
        </div>
        <form className="space-y-5" onSubmit={onSubmit}>
          <Input
            label="Username atau Email"
            autoComplete="username"
            error={form.formState.errors.usernameOrEmail?.message}
            {...form.register('usernameOrEmail')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Button type="submit" fullWidth disabled={form.formState.isSubmitting} className="mt-2 !h-11">
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
            Masuk
          </Button>
        </form>
      </Card>
    </main>
  );
}
