// ============================================================
// ProtectedRoute.jsx - NEXOVA AgendaPro
// Protege rutas que requieren autenticación y/o rol específico
// - Maneja loading con spinner + timeout visual
// - Redirige a /login si no hay sesión
// - Redirige a /no-autorizado si el rol no coincide
// ============================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, loading, hasRole, profile } = useAuth();
  const location = useLocation();

  // Mientras se verifica la sesión, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="text-center">
          {/* Spinner NEXOVA */}
          <div className="inline-block w-12 h-12 border-4 border-[#0F766E]/20 border-t-[#0F766E] rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-600 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Verificando sesión...
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Si esto demora más de 10 segundos, recarga la página (F5)
          </p>
        </div>
      </div>
    );
  }

  // No autenticado -> login
  if (!isAuthenticated) {
    console.log('[PROTECTED] No autenticado, redirigiendo a /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Autenticado pero perfil aún no cargado (caso raro)
  if (!profile) {
    console.warn('[PROTECTED] Autenticado pero sin perfil. Redirigiendo a login.');
    return <Navigate to="/login" replace />;
  }

  // Verificar roles si se especifican
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      console.warn('[PROTECTED] Rol insuficiente. Requiere:', requiredRoles, 'Tiene:', profile.roles);
      return <Navigate to="/no-autorizado" replace />;
    }
  }

  return children;
}
