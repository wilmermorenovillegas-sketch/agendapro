// ═══════════════════════════════════════════════════════════════
// src/components/common/AdminLayout.jsx
// Layout del panel administrativo — VERSION RECOVERY-26-04-2026
//
// Mantiene los 12 módulos originales y agrega los 3 nuevos de Phase 1.6:
//   - Audit Logs (registro de acciones)
//   - Papelera (soft-deleted records)
//   - Límites (tenant limits / billing)
// ═══════════════════════════════════════════════════════════════

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Items del menú. El campo `adminOnly` marca los que solo ven Admin/SuperAdmin
const NAV_ITEMS = [
  // ─── Módulos principales (Phase 2) ───
  { path: '/admin/dashboard',     label: 'Dashboard',      icon: '📊' },
  { path: '/admin/business',      label: 'Mi Negocio',     icon: '🏢', adminOnly: true },
  { path: '/admin/locations',     label: 'Sedes',          icon: '📍', adminOnly: true },
  { path: '/admin/professionals', label: 'Profesionales',  icon: '👥', adminOnly: true },
  { path: '/admin/services',      label: 'Servicios',      icon: '📋' },
  { path: '/admin/clients',       label: 'Clientes',       icon: '👤' },
  { path: '/admin/appointments',  label: 'Citas',          icon: '📅' },
  { path: '/admin/payments',      label: 'Pagos',          icon: '💰', adminOnly: true },
  { path: '/admin/users',         label: 'Usuarios',       icon: '🔑', adminOnly: true },
  { path: '/admin/permissions',   label: 'Permisos',       icon: '🔐', adminOnly: true },
  { path: '/admin/performance',   label: 'Rendimiento',    icon: '🏆' },
  { path: '/admin/reports',       label: 'Reportes & IA',  icon: '🤖', adminOnly: true },
  { path: '/admin/chat',          label: 'Chat',           icon: '💬' },

  // ─── Módulos avanzados (Phase 1.6) ───
  { path: '/admin/audit-logs',    label: 'Auditoría',      icon: '📜', adminOnly: true },
  { path: '/admin/trash',         label: 'Papelera',       icon: '🗑️', adminOnly: true },
  { path: '/admin/limits',        label: 'Límites',        icon: '📈', adminOnly: true },
];

export default function AdminLayout() {
  const { profile, signOut, isAdmin, displayRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // signOut del AuthContext V3 ya redirige a /login automáticamente,
    // pero dejamos el navigate por si acaso falla la redirección forzada
    await signOut();
    navigate('/login');
  };

  // Filtrar items según rol
  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ═══════════ SIDEBAR (DESKTOP) ═══════════ */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-gray-100">
        {/* Header con logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 80 80">
              <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="#0F766E" strokeWidth="2"/>
              <circle cx="40" cy="4" r="3.5" fill="#0F766E"/>
              <circle cx="68" cy="20" r="3.5" fill="#0D9488"/>
              <circle cx="12" cy="56" r="3.5" fill="#0F766E"/>
              <line x1="28" y1="56" x2="28" y2="26" stroke="#0F766E" strokeWidth="3" strokeLinecap="round"/>
              <line x1="28" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="3" strokeLinecap="round"/>
              <line x1="52" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <div>
              <div className="font-sora font-bold text-slate-800 tracking-wider text-sm">AGENDAPRO</div>
              <div className="text-[10px] text-gray-400">Panel Administrativo</div>
            </div>
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar (perfil + logout) */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-teal-600 font-semibold truncate">
                {displayRole}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{profile?.tenant_name}</div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-1 overflow-auto">
        {/* Header móvil con menú scrollable */}
        <div className="md:hidden bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-sora font-bold text-slate-800 tracking-wider text-sm">AGENDAPRO</div>
              <div className="text-[10px] text-teal-600 font-semibold">{displayRole}</div>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {visibleNavItems.map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`
                }>
                {item.icon} {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
