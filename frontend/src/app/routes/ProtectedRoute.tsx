import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';
import type { RoleName } from '../../features/auth/auth.types';
import { ErrorState } from '../../shared/components/ErrorState';

type ProtectedRouteProps = {
  allowedRoles?: RoleName[];
  children: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <ErrorState
        title="Akses ditolak"
        message="Role Anda tidak memiliki akses ke halaman ini."
      />
    );
  }

  return <>{children}</>;
}
