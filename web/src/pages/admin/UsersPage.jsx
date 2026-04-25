// ============================================================
// UsersPage.jsx - NEXOVA AgendaPro
// Modulo de Gestion de Usuarios (Admin only)
// ============================================================

import { useState, useEffect } from 'react';
import { listUsers, resetPassword, updateUser, generateTempPassword } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    const result = await listUsers();
    if (result.success) setUsers(result.users);
    else setError(result.error || 'Error cargando usuarios');
    setLoading(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openEditModal = (user) => {
    setSelectedUser({ ...user });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser({ ...user, newPassword: '' });
    setModalMode('password');
    setModalOpen(true);
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id) {
      showToast('error', 'No puedes desactivar tu propia cuenta');
      return;
    }
    const result = await updateUser(user.id, { is_active: !user.is_active });
    if (result.success) {
      showToast('success', `Usuario ${!user.is_active ? 'activado' : 'desactivado'}`);
      loadData();
    } else {
      showToast('error', result.error);
    }
  };

  const handleSave = async () => {
    if (modalMode === 'edit') {
      const result = await updateUser(selectedUser.id, {
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        phone_number: selectedUser.phone_number,
        role_name: selectedUser.role,
      });
      if (result.success) {
        showToast('success', 'Datos actualizados');
        setModalOpen(false);
        loadData();
      } else {
        showToast('error', result.error);
      }
    } else if (modalMode === 'password') {
      if (!selectedUser.newPassword || selectedUser.newPassword.length < 6) {
        showToast('error', 'La contrasena debe tener al menos 6 caracteres');
        return;
      }
      const result = await resetPassword(selectedUser.id, selectedUser.newPassword);
      if (result.success) {
        showToast('success', `Contrasena reseteada: ${selectedUser.newPassword}`);
        setModalOpen(false);
      } else {
        showToast('error', result.error);
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q)
    );
  });

  const formatDate = (iso) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const roleBadge = (role) => {
    const colors = {
      SuperAdmin: 'bg-purple-100 text-purple-800 border-purple-200',
      Admin: 'bg-teal-100 text-teal-800 border-teal-200',
      Professional: 'bg-blue-100 text-blue-800 border-blue-200',
      Client: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const labels = {
      SuperAdmin: 'Super Admin',
      Admin: 'Administrador',
      Professional: 'Profesional',
      Client: 'Cliente',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[role] || colors.Client}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
            Gestion de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">Administra los usuarios de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="px-4 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none text-sm w-64"
          />
          <button onClick={loadData} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition">
            Recargar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{users.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Activos</div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{users.filter(u => u.is_active).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Profesionales</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{users.filter(u => u.role === 'Professional').length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Clientes</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{users.filter(u => u.role === 'Client').length}</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-10 h-10 border-4 border-[#0F766E]/20 border-t-[#0F766E] rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-500">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {search ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Telefono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ultimo Login</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{u.full_name || '(sin nombre)'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-slate-600">{u.phone_number || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === currentUser.id}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition ${u.is_active ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'} ${u.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={u.id === currentUser.id ? 'No puedes desactivar tu cuenta' : 'Click para cambiar'}
                      >
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.last_login_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(u)} className="px-3 py-1 rounded-md text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 transition">
                          Editar
                        </button>
                        <button onClick={() => openPasswordModal(u)} className="px-3 py-1 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
                          Resetear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              {modalMode === 'edit' ? 'Editar usuario' : 'Resetear contrasena'}
            </h3>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
              <div className="text-xs text-slate-500 font-semibold uppercase">Usuario</div>
              <div className="font-semibold text-slate-800 mt-0.5">{selectedUser.full_name}</div>
              <div className="text-xs text-slate-500">{selectedUser.email}</div>
            </div>

            {modalMode === 'edit' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">NOMBRE</label>
                  <input type="text" value={selectedUser.first_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">APELLIDO</label>
                  <input type="text" value={selectedUser.last_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TELEFONO</label>
                  <input type="text" value={selectedUser.phone_number || ''} onChange={(e) => setSelectedUser({ ...selectedUser, phone_number: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ROL</label>
                  <select value={selectedUser.role || 'Client'} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })} disabled={selectedUser.id === currentUser.id} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm disabled:bg-slate-50">
                    <option value="Admin">Administrador</option>
                    <option value="Professional">Profesional</option>
                    <option value="Client">Cliente</option>
                  </select>
                  {selectedUser.id === currentUser.id && (
                    <p className="text-xs text-slate-500 mt-1">No puedes cambiar tu propio rol</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NUEVA CONTRASENA</label>
                <div className="flex gap-2">
                  <input type="text" value={selectedUser.newPassword || ''} onChange={(e) => setSelectedUser({ ...selectedUser, newPassword: e.target.value })} placeholder="Minimo 6 caracteres" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm font-mono" />
                  <button onClick={() => setSelectedUser({ ...selectedUser, newPassword: generateTempPassword() })} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition">
                    Generar
                  </button>
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mt-2">
                  <strong>Importante:</strong> Copia la contrasena antes de guardar. No se volvera a mostrar.
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg text-white font-bold transition" style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold z-50 ${toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
