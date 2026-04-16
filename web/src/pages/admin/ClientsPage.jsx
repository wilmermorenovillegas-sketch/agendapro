// ═══════════════════════════════════════════════════════════════
// src/pages/admin/ClientsPage.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import clientService from '../../services/clientService';

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

  const loadData = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data || []);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleNew = () => {
    setEditing(null); setForm(EMPTY); setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleEdit = (c) => {
    setEditing(c);
    setForm({
      first_name: c.first_name, last_name: c.last_name,
      email: c.email || '', phone: c.phone || '',
      document_type: c.document_type || 'DNI',
      document_number: c.document_number || '',
      birth_date: c.birth_date || '',
      notes: c.notes || '',
      is_active: c.is_active,
    });
    setShowForm(true); setError(''); setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.first_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.last_name.trim()) { setError('El apellido es obligatorio.'); return; }

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
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar a ${c.first_name} ${c.last_name}?`)) return;
    try {
      await clientService.remove(c.id);
      setSuccess('Cliente eliminado.');
      setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const f = (field, v) => { setForm(p => ({ ...p, [field]: v })); setError(''); };

  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.document_number?.includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
                  <div key={c.id} className="card p-5">
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
                          {c.total_appointments > 0 && (
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-gray-500">📅 {c.total_appointments} citas</span>
                              <span className="text-teal-600 font-semibold">S/ {Number(c.total_spent).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
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
                    <input value={form.phone} onChange={(e) => f('phone', e.target.value)}
                      placeholder="+51 999 999 999" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                      placeholder="cliente@correo.com" className="input-field" />
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
                    <input value={form.document_number} onChange={(e) => f('document_number', e.target.value)}
                      placeholder="12345678" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Fecha de nacimiento</label>
                  <input type="date" value={form.birth_date} onChange={(e) => f('birth_date', e.target.value)}
                    className="input-field" />
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
