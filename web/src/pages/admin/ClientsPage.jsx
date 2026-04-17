// ═══════════════════════════════════════════════════════════════
// src/pages/admin/ClientsPage.jsx
// Gestión de Clientes con historial y estadísticas
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import clientService from '../../services/clientService';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En curso', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'No asistió', color: 'bg-gray-200 text-gray-600' },
};

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  document_type: 'DNI', document_number: '',
  birth_date: '', notes: '', is_active: true,
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [searchTerm, setSearchTerm] = useState('');
  // Detalle del cliente
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data || []);
    } catch (err) { setError('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleViewDetail = async (client) => {
    setLoadingDetail(true);
    setSelectedClient(client);
    setShowForm(false);
    try {
      const detail = await clientService.getDetail(client.id);
      setClientDetail(detail);
    } catch (err) { setError('Error cargando detalle: ' + err.message); }
    finally { setLoadingDetail(false); }
  };

  const handleNew = () => {
    setEditing(null); setForm(EMPTY); setShowForm(true);
    setSelectedClient(null); setClientDetail(null);
    setError(''); setSuccess('');
  };

  const handleEdit = (c) => {
    setEditing(c);
    setForm({
      first_name: c.first_name, last_name: c.last_name,
      email: c.email || '', phone: c.phone || '',
      document_type: c.document_type || 'DNI',
      document_number: c.document_number || '',
      birth_date: c.birth_date || '', notes: c.notes || '', is_active: c.is_active,
    });
    setShowForm(true); setSelectedClient(null); setClientDetail(null);
    setError(''); setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.first_name.trim()) return setError('El nombre es obligatorio.');
    if (!form.last_name.trim()) return setError('El apellido es obligatorio.');

    setSaving(true);
    try {
      const payload = { ...form, birth_date: form.birth_date || null };
      if (editing) {
        await clientService.update(editing.id, payload);
        setSuccess(`${form.first_name} ${form.last_name} actualizado.`);
      } else {
        await clientService.create(payload);
        setSuccess(`${form.first_name} ${form.last_name} registrado.`);
      }
      setShowForm(false); setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar a ${c.first_name} ${c.last_name}?`)) return;
    try {
      await clientService.remove(c.id);
      setSuccess('Cliente eliminado.');
      setLoading(true); await loadData();
    } catch (err) { setError(err.message); }
  };

  const f = (field, v) => { setForm(p => ({ ...p, [field]: v })); setError(''); };

  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.document_number?.includes(q);
  });

  if (loading) {
    return <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  // ═══ VISTA DETALLE DEL CLIENTE ═══
  if (selectedClient && !showForm) {
    return (
      <div className="p-6">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setSelectedClient(null); setClientDetail(null); }}
              className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">
              {selectedClient.first_name} {selectedClient.last_name}
            </h1>
          </div>

          {loadingDetail ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clientDetail ? (
            <div className="space-y-4">
              {/* Info del cliente + stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Datos</h3>
                  <div className="space-y-2 text-sm">
                    {selectedClient.phone && <p className="text-gray-700">📞 {selectedClient.phone}</p>}
                    {selectedClient.email && <p className="text-gray-700">✉️ {selectedClient.email}</p>}
                    {selectedClient.document_number && (
                      <p className="text-gray-500">{selectedClient.document_type}: {selectedClient.document_number}</p>
                    )}
                    {selectedClient.birth_date && <p className="text-gray-500">🎂 {selectedClient.birth_date}</p>}
                    {selectedClient.notes && <p className="text-gray-400 italic mt-2">"{selectedClient.notes}"</p>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleEdit(selectedClient)} className="btn-secondary px-4 py-2 text-sm">✏️ Editar</button>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Estadísticas</h3>
                  {clientDetail.stats ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-blue-700 font-sora">{clientDetail.stats.total_appointments || 0}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase">Total citas</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-green-700 font-sora">{clientDetail.stats.completed || 0}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase">Completadas</div>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-teal-700 font-sora">S/ {Number(clientDetail.stats.total_spent || 0).toFixed(0)}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase">Total gastado</div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3 text-center">
                        <div className="text-sm font-bold text-purple-700 truncate">{clientDetail.stats.favorite_service || '—'}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase">Favorito</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin datos aún</p>
                  )}
                </div>
              </div>

              {/* Historial de citas */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Historial de Citas ({(clientDetail.history || []).length})
                </h3>
                {(clientDetail.history || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin citas registradas</p>
                ) : (
                  <div className="space-y-2">
                    {(clientDetail.history || []).map(a => {
                      const d = new Date(a.start_time);
                      const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
                      return (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-sm font-bold text-slate-700">
                                {d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                              </div>
                              <div className="text-xs text-gray-400">
                                {d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{a.service_name}</div>
                              <div className="text-xs text-gray-400">📍 {a.location_name} · {a.duration_minutes}min</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={'px-2 py-0.5 text-[10px] font-bold rounded-full ' + statusInfo.color}>
                              {statusInfo.label}
                            </span>
                            <span className="text-sm font-semibold text-teal-600">S/ {Number(a.price).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Clientes</h1>
            <p className="text-sm text-gray-400 mt-1">{clients.length} clientes registrados</p>
          </div>
          {!showForm && <button onClick={handleNew} className="btn-primary px-5 py-2.5">+ Nuevo Cliente</button>}
        </div>

        {success && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">✓ {success}</div>}
        {error && !showForm && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {/* LISTA */}
        {!showForm && (
          <>
            {clients.length > 0 && (
              <div className="mb-4">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por nombre, email, teléfono o documento..."
                  className="input-field" />
              </div>
            )}

            {clients.length === 0 ? (
              <div className="card p-12 text-center">
                <span className="text-4xl mb-4 block">👤</span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Sin clientes</h3>
                <p className="text-gray-400 text-sm">Use el botón <strong>"+ Nuevo Cliente"</strong> para registrar a sus clientes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((c) => (
                  <div key={c.id} className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewDetail(c)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-teal-500 to-teal-700">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{c.first_name} {c.last_name}</h3>
                          {c.phone && <p className="text-sm text-gray-500">📞 {c.phone}</p>}
                          {c.email && <p className="text-sm text-gray-500">✉️ {c.email}</p>}
                          {c.document_number && <p className="text-xs text-gray-400 mt-1">{c.document_type}: {c.document_number}</p>}
                          {(c.total_appointments > 0 || c.total_spent > 0) && (
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-gray-500">📅 {c.total_appointments} citas</span>
                              <span className="text-teal-600 font-semibold">S/ {Number(c.total_spent).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(c)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg">✏️</button>
                        <button onClick={() => handleDelete(c)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && searchTerm && (
                  <div className="card p-8 text-center text-gray-400 text-sm">
                    No se encontraron clientes con "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* FORMULARIO */}
        {showForm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-slate-800 font-sora">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Datos del Cliente</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre *</label>
                    <input value={form.first_name} onChange={(e) => f('first_name', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Apellido *</label>
                    <input value={form.last_name} onChange={(e) => f('last_name', e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Teléfono</label>
                    <input value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+51 999 999 999" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="cliente@correo.com" className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Tipo doc.</label>
                    <select value={form.document_type} onChange={(e) => f('document_type', e.target.value)} className="input-field">
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="RUC">RUC</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Número de documento</label>
                    <input value={form.document_number} onChange={(e) => f('document_number', e.target.value)} placeholder="12345678" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Fecha de nacimiento</label>
                  <input type="date" value={form.birth_date} onChange={(e) => f('birth_date', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Notas</label>
                  <textarea value={form.notes} onChange={(e) => f('notes', e.target.value)}
                    rows={2} placeholder="Alergias, preferencias, observaciones..." className="input-field resize-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
                {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>)
                  : editing ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary px-6 py-3">Cancelar</button>
            </div>
            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
}
