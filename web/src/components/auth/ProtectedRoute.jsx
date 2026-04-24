// ============================================================
// ProtectedRoute.jsx - NEXOVA AgendaPro
// VERSION: LOGIN-FIX-V2 (subido el 24/04/2026)
// Protege rutas que requieren autenticacion y/o rol especifico
// ============================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

console.log('%c[PROTECTED-V2] ProtectedRoute cargado', 'color:#0D9488;font-weight:bold');

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, loading, hasRole, profile } = useAuth();
  const location = useLocation();

  // Mientras se verifica la sesion, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#0F766E]/20 border-t-[#0F766E] rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-600 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Verificando sesion...
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Si esto demora mas de 10 segundos, recarga la pagina (F5)
          </p>
          <p className="mt-4 text-[10px] text-slate-300">LOGIN-FIX-V2</p>
        </div>
      </div>
    );
  }

  // No autenticado -> login
  if (!isAuthenticated) {
    console.log('[PROTECTED-V2] No autenticado, redirigiendo a /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Autenticado pero perfil aun no cargado
  if (!profile) {
    console.warn('[PROTECTED-V2] Autenticado pero sin perfil. Redirigiendo a login.');
    return <Navigate to="/login" replace />;
  }

  // Verificar roles si se especifican
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      console.warn('[PROTECTED-V2] Rol insuficiente. Requiere:', requiredRoles, 'Tiene:', profile.roles);
      return <Navigate to="/no-autorizado" replace />;
    }
  }

  return children;
}
