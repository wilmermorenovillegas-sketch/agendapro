// components/InvitationsTab.jsx
// Tab de invitaciones dentro de UsersPage

import { useState, useEffect } from 'react';
import { Mail, Send, X, Clock, Check, Ban, Copy } from 'lucide-react';
import { inviteUser, listInvitations, cancelInvitation } from '../services/invitationsService';
import { toast } from 'react-hot-toast';

export default function InvitationsTab() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Professional',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [filterStatus]);

  const loadInvitations = async () => {
    try {
      const status = filterStatus === 'all' ? null : filterStatus;
      const data = await listInvitations(status);
      setInvitations(data);
    } catch (error) {
      toast.error('Error al cargar invitaciones');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);

    try {
      const result = await inviteUser(
        inviteForm.email,
        inviteForm.role,
        inviteForm.firstName,
        inviteForm.lastName,
        inviteForm.phoneNumber
      );

      // Copiar link de invitación al portapapeles
      const inviteUrl = `${window.location.origin}/accept-invite/${result.token}`;
      await navigator.clipboard.writeText(inviteUrl);

      toast.success('Invitación enviada. Link copiado al portapapeles.');
      
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        role: 'Professional',
        firstName: '',
        lastName: '',
        phoneNumber: ''
      });
      loadInvitations();
    } catch (error) {
      toast.error(error.message || 'Error al enviar invitación');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('¿Cancelar esta invitación?')) return;

    try {
      await cancelInvitation(invitationId, 'Cancelado por Admin');
      toast.success('Invitación cancelada');
      loadInvitations();
    } catch (error) {
      toast.error('Error al cancelar invitación');
    }
  };

  const copyInviteLink = async (token) => {
    const inviteUrl = `${window.location.origin}/accept-invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar link');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pendiente' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', icon: Check, label: 'Aceptada' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', icon: Ban, label: 'Expirada' },
      cancelled: { bg: 'bg-slate-100', text: 'text-slate-800', icon: X, label: 'Cancelada' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredInvitations = invitations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Invitaciones</h3>
          <p className="text-slate-600 text-sm">Gestiona las invitaciones enviadas</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
        >
          <Send className="w-4 h-4" />
          <span>Invitar Usuario</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex space-x-2">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendientes' },
          { value: 'accepted', label: 'Aceptadas' },
          { value: 'expired', label: 'Expiradas' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === filter.value
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tabla de invitaciones */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No hay invitaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Rol</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Enviada</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Expira</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-800">{inv.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {inv.first_name || inv.last_name
                      ? `${inv.first_name || ''} ${inv.last_name || ''}`.trim()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{inv.role}</td>
                  <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(inv.invited_at)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(inv.expires_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => copyInviteLink(inv.token)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Invitar Usuario */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Invitar Usuario</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rol *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="Admin">Admin</option>
                  <option value="Professional">Professional</option>
                  <option value="Client">Cliente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={inviteForm.phoneNumber}
                  onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="+51 999 999 999"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-300 transition"
                >
                  {inviting ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
