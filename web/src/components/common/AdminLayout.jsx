// ═══════════════════════════════════════════════════════════════
// src/components/common/AdminLayout.jsx
// Layout con sidebar — VERSIÓN FINAL con 10 menús
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
  { path: '/admin/chat', label: 'Chat', icon: '💬' },
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

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {profile?.tenant_name}
              </div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="font-sora font-bold text-slate-800 tracking-wider text-sm">AGENDAPRO</div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          {/* Mobile nav */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {NAV_ITEMS.map((item) => (
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
force rebuild
