// ═══════════════════════════════════════════════════════════════
// src/components/common/AdminLayout.jsx
// Layout con sidebar de navegación para el panel administrativo
// ═══════════════════════════════════════════════════════════════

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/business', label: 'Mi Negocio', icon: '🏢' },
  { path: '/admin/locations', label: 'Sedes', icon: '📍' },
  { path: '/admin/professionals', label: 'Profesionales', icon: '👥' },
  { path: '/admin/services', label: 'Servicios', icon: '📋' },
  { path: '/admin/clients', label: 'Clientes', icon: '👤' },
  { path: '/admin/appointments', label: 'Citas', icon: '📅' },
  { path: '/admin/performance', label: 'Rendimiento', icon: '🏆' },
  { path: '/admin/reports', label: 'Reportes & IA', icon: '🤖' },
  // { path: '/admin/professionals', label: 'Profesionales', icon: '👥' },
  // { path: '/admin/services', label: 'Servicios', icon: '📋' },
  // { path: '/admin/appointments', label: 'Citas', icon: '📅' },
  // { path: '/admin/clients', label: 'Clientes', icon: '👤' },
];

export default function AdminLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-gray-100">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 80 80">
              <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="#0F766E" strokeWidth="2"/>
              <line x1="28" y1="56" x2="28" y2="26" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
              <line x1="28" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
              <line x1="52" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <div>
              <span className="font-bold text-slate-800 tracking-wider text-sm font-sora">AGENDAPRO</span>
              <p className="text-[10px] text-gray-400">Panel Administrativo</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Perfil y logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name}</p>
              <p className="text-[11px] text-gray-400 truncate">{profile?.tenant_name}</p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
                    className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 tracking-wider text-sm font-sora">AGENDAPRO</span>
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) =>
                  `p-2 rounded-lg text-lg ${isActive ? 'bg-teal-50' : ''}`
                }>
                {item.icon}
              </NavLink>
            ))}
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 md:overflow-y-auto mt-14 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
