// ============================================================
// PermissionsPage.jsx - NEXOVA AgendaPro
// Gestión de Permisos por Usuario (Admin only)
// ============================================================

import { useState, useEffect } from 'react';
import { listAllPermissions, listUsersWithPermissions, assignPermissions } from '../../services/permissionsService';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [permsResult, usersResult] = await Promise.all([
      listAllPermissions(),
      listUsersWithPermissions(),
    ]);

    if (!permsResult.success) {
      setError(permsResult.error);
    } else {
      setPermissions(permsResult.permissions);
    }

    if (!usersResult.success) {
      setError(usersResult.error);
    } else {
      setUsers(usersResult.users || []);
      
      // Construir mapa de permisos por usuario
      const permMap = {};
      (usersResult.users || []).forEach(u => {
        permMap[u.user_id] = u.permissions || [];
      });
      setUserPermissions(permMap);
    }

    setLoading(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleTogglePermission = (userId, permCode) => {
    setUserPermissions(prev => {
      const current = prev[userId] || [];
      const has = current.includes(permCode);
      
      return {
        ...prev,
        [userId]: has 
          ? current.filter(c => c !== permCode)
          : [...current, permCode]
      };
    });
  };

  const handleSave = async (userId) => {
    setSaving(true);
    const codes = userPermissions[userId] || [];
    const result = await assignPermissions(userId, codes);
    
    if (result.success) {
      showToast('success', 'Permisos guardados correctamente');
      loadData();
    } else {
      showToast('error', result.error || 'Error al guardar');
    }
    
    setSaving(false);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const moduleNames = {
    dashboard: 'Dashboard',
    business: 'Mi Negocio',
    locations: 'Sedes',
    professionals: 'Profesionales',
    services: 'Servicios',
    clients: 'Clientes',
    appointments: 'Citas',
    users: 'Usuarios',
    performance: 'Rendimiento',
    reports: 'Reportes & IA',
    chat: 'Chat',
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-[#0F766E]/20 border-t-[#0F766E] rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
            Gestión de Permisos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controla qué módulos puede ver cada usuario
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
        >
          Recargar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          No hay usuarios registrados
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(user => {
            const userPerms = userPermissions[user.user_id] || [];
            const isExpanded = selectedUser === user.user_id;

            return (
              <div key={user.user_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setSelectedUser(isExpanded ? null : user.user_id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold">
                      {user.full_name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                      {user.role}
                    </span>
                    <span className="text-xs text-slate-400">
                      {userPerms.length} permisos asignados
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {Object.entries(groupedPermissions).map(([module, perms]) => (
                        <div key={module} className="bg-white rounded-lg border border-slate-200 p-3">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            {moduleNames[module] || module}
                          </div>
                          <div className="space-y-1.5">
                            {perms.map(perm => {
                              const hasIt = userPerms.includes(perm.code);
                              return (
                                <label
                                  key={perm.code}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasIt}
                                    onChange={() => handleTogglePermission(user.user_id, perm.code)}
                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                  />
                                  <span className={hasIt ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                                    {perm.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className="text-sm text-slate-600">
                        {userPerms.length} de {permissions.length} permisos seleccionados
                      </span>
                      <button
                        onClick={() => handleSave(user.user_id)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-white font-bold transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}
                      >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold z-50 ${
            toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
