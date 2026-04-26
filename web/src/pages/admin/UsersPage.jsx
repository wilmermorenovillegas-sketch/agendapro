// src/pages/admin/UsersPage.jsx
// Gestión de usuarios CON TABS (Usuarios + Invitaciones)

import { useState, useEffect } from 'react';
import { Users, Send, UserPlus, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import InvitationsTab from '../../components/InvitationsTab';
import { supabase } from '../../config/supabaseClient';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('users');
  
  // ========================================
  // ESTADO PARA TAB DE USUARIOS ACTIVOS
  // ========================================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'Professional'
  });

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // ========================================
  // FUNCIONES PARA USUARIOS ACTIVOS
  // ========================================
  
  const loadUsers = async () => {
    setLoading(true);
    try {
      // Obtener perfil del usuario actual
      const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
      
      if (profileError) throw profileError;
      
      const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
      const tenantId = profile.tenant_id;

      // Obtener usuarios del tenant
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone_number,
          is_active,
          created_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Obtener roles de cada usuario
      const usersWithRoles = await Promise.all(
        usersData.map(async (user) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id)
            .single();
          
          // Obtener email desde auth.users (necesitamos un RPC para esto)
          // Por ahora usamos el ID como placeholder
          return {
            ...user,
            email: `user-${user.id.substring(0, 8)}@tenant.com`, // Placeholder
            role: rolesData?.roles?.name || 'Sin rol'
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: formData.email,
        p_password: formData.password,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_phone_number: formData.phoneNumber,
        p_role_name: formData.role,
        p_force_password_change: true
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'Professional'
      });
      loadUsers();
    } catch (error) {
      toast.error(error.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuario eliminado');
      loadUsers();
    } catch (error) {
      toast.error('Error al eliminar usuario');
      console.error(error);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Usuario ${!currentStatus ? 'activado' : 'desactivado'}`);
      loadUsers();
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
      console.error(error);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Gestión de Usuarios
        </h1>
        <p className="text-slate-600">
          Administra usuarios e invitaciones del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-teal-600 text-teal-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Usuarios Activos</span>
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-4 px-1 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'invitations'
                ? 'border-teal-600 text-teal-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>Invitaciones</span>
          </button>
        </div>
      </div>

      {/* ========================================
          TAB: USUARIOS ACTIVOS
      ======================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Botón crear usuario */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </button>
          </div>

          {/* Tabla de usuarios */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Teléfono</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Rol</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Estado</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.phone_number || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          <Shield className="w-3 h-3 mr-1" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal: Crear Usuario */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">Crear Usuario</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contraseña temporal *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="+51 999 999 999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rol *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Professional">Professional</option>
                      <option value="Client">Cliente</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                    >
                      Crear Usuario
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          TAB: INVITACIONES
      ======================================== */}
      {activeTab === 'invitations' && <InvitationsTab />}
    </div>
  );
}
