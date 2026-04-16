// ═══════════════════════════════════════════════════════════════
// src/pages/admin/ServicesPage.jsx
// Catálogo de Servicios
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import serviceService from '../../services/serviceService';
import professionalService from '../../services/professionalService';
import locationService from '../../services/locationService';

const COLORS = ['#0F766E','#2563EB','#7C3AED','#DC2626','#EA580C','#CA8A04','#16A34A','#0891B2','#9333EA','#E11D48'];

const EMPTY = {
  name: '', description: '',
  category_id: null,
  duration_minutes: 30, price: 0, cost: 0,
  color: '#0F766E',
  accepts_online: true, requires_payment: false,
  buffer_minutes: 0,
  notes: '', is_active: true,
  professional_ids: [], location_ids: [],
};

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const loadData = async () => {
    try {
      const [svcs, cats, profs, locs] = await Promise.all([
        serviceService.getAll(),
        serviceService.getCategories(),
        professionalService.getAll(),
        locationService.getAll(),
      ]);
      setServices(svcs || []);
      setCategories(cats || []);
      setProfessionals(profs || []);
      setLocations(locs || []);
    } catch (err) {
      setError('Error cargando datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setForm({
      name: svc.name, description: svc.description || '',
      category_id: svc.category_id,
      duration_minutes: svc.duration_minutes, price: svc.price, cost: svc.cost || 0,
      color: svc.color || '#0F766E',
      accepts_online: svc.accepts_online, requires_payment: svc.requires_payment,
      buffer_minutes: svc.buffer_minutes || 0,
      notes: svc.notes || '', is_active: svc.is_active,
      professional_ids: svc.professional_ids || [],
      location_ids: svc.location_ids || [],
    });
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('El nombre del servicio es obligatorio.'); return; }
    if (form.duration_minutes <= 0) { setError('La duración debe ser mayor a 0 minutos.'); return; }

    setSaving(true);
    try {
      if (editing) {
        await serviceService.update(editing.id, form);
        setSuccess(`"${form.name}" actualizado exitosamente.`);
      } else {
        await serviceService.create(form);
        setSuccess(`"${form.name}" creado exitosamente.`);
      }
      setShowForm(false);
      setLoading(true);
      await loadData();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svc) => {
    if (!confirm(`¿Eliminar el servicio "${svc.name}"?`)) return;
    try {
      await serviceService.remove(svc.id);
      setSuccess('Servicio eliminado.');
      setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await serviceService.createCategory(newCatName);
      setNewCatName('');
      setShowNewCat(false);
      const cats = await serviceService.getCategories();
      setCategories(cats || []);
    } catch (err) { setError(err.message); }
  };

  const toggleArr = (field, id) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(x => x !== id)
        : [...prev[field], id],
    }));
  };

  const f = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); };

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Catálogo de Servicios</h1>
            <p className="text-sm text-gray-400 mt-1">{services.length} servicios registrados</p>
          </div>
          {!showForm && (
            <button onClick={handleNew} className="btn-primary px-5 py-2.5">+ Nuevo Servicio</button>
          )}
        </div>

        {/* Mensajes */}
        {success && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">✓ {success}</div>}
        {error && !showForm && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {/* ═══ LISTA ═══ */}
        {!showForm && (
          <>
            {services.length === 0 ? (
              <div className="card p-12 text-center">
                <span className="text-4xl mb-4 block">📋</span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Sin servicios</h3>
                <p className="text-gray-400 text-sm">Use el botón <strong>"+ Nuevo Servicio"</strong> para agregar servicios al catálogo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <div key={svc.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                             style={{ backgroundColor: svc.color || '#0F766E' }}>
                          {svc.category_icon || '📋'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800">{svc.name}</h3>
                            {!svc.is_active && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">Inactivo</span>
                            )}
                            {svc.category_name && (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-full">{svc.category_name}</span>
                            )}
                          </div>
                          {svc.description && <p className="text-sm text-gray-400 mt-1">{svc.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-600">⏱ {svc.duration_minutes} min</span>
                            <span className="font-semibold text-teal-600">S/ {Number(svc.price).toFixed(2)}</span>
                            {svc.professional_names?.length > 0 && (
                              <span className="text-gray-500">👥 {svc.professional_names.length}</span>
                            )}
                            {svc.location_names?.length > 0 && (
                              <span className="text-gray-500">📍 {svc.location_names.length}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(svc)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => handleDelete(svc)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ FORMULARIO ═══ */}
        {showForm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-slate-800 font-sora">
                {editing ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

            {/* Datos básicos */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Información del Servicio</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre del servicio *</label>
                  <input value={form.name} onChange={(e) => f('name', e.target.value)}
                    placeholder="Ej: Consulta dental, Corte de cabello" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Descripción</label>
                  <textarea value={form.description} onChange={(e) => f('description', e.target.value)}
                    rows={2} placeholder="Describa qué incluye el servicio..." className="input-field resize-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-600">Categoría</label>
                    <button type="button" onClick={() => setShowNewCat(!showNewCat)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium">+ Nueva categoría</button>
                  </div>
                  {showNewCat && (
                    <div className="flex gap-2 mb-2">
                      <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nombre de la categoría" className="input-field flex-1" />
                      <button type="button" onClick={handleCreateCategory} className="btn-primary px-4">Crear</button>
                    </div>
                  )}
                  <select value={form.category_id || ''} onChange={(e) => f('category_id', e.target.value || null)}
                    className="input-field">
                    <option value="">Sin categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Duración y precio */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Duración y Precio</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Duración (minutos) *</label>
                    <input type="number" min="5" max="480" step="5" value={form.duration_minutes}
                      onChange={(e) => f('duration_minutes', parseInt(e.target.value) || 30)}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Tiempo de descanso (min)</label>
                    <input type="number" min="0" max="60" value={form.buffer_minutes}
                      onChange={(e) => f('buffer_minutes', parseInt(e.target.value) || 0)}
                      className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Precio (S/) *</label>
                    <input type="number" min="0" step="0.01" value={form.price}
                      onChange={(e) => f('price', parseFloat(e.target.value) || 0)}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Costo interno (S/)</label>
                    <input type="number" min="0" step="0.01" value={form.cost}
                      onChange={(e) => f('cost', parseFloat(e.target.value) || 0)}
                      className="input-field" />
                    <p className="text-xs text-gray-400 mt-1">Solo para cálculo de rentabilidad (no se muestra al cliente)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración visual */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Configuración</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => f('color', c)}
                        className={'w-8 h-8 rounded-full transition-transform' + (form.color === c ? ' ring-2 ring-offset-2 ring-teal-500 scale-110' : ' hover:scale-110')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => f('is_active', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                    <span className="text-sm text-gray-600">Servicio activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.accepts_online} onChange={(e) => f('accepts_online', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                    <span className="text-sm text-gray-600">Disponible en reserva online</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.requires_payment} onChange={(e) => f('requires_payment', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                    <span className="text-sm text-gray-600">Requiere pago por adelantado</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Profesionales */}
            {professionals.length > 0 && (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Profesionales que ofrecen este servicio</h3>
                <div className="space-y-2">
                  {professionals.map(p => (
                    <label key={p.id} className={'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ' +
                      (form.professional_ids.includes(p.id) ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100')}>
                      <input type="checkbox" checked={form.professional_ids.includes(p.id)}
                        onChange={() => toggleArr('professional_ids', p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                           style={{ backgroundColor: p.color || '#0F766E' }}>
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-800">{p.full_name}</span>
                        {p.specialty && <span className="text-xs text-gray-400 ml-2">— {p.specialty}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sedes */}
            {locations.length > 0 && (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Sedes donde se ofrece</h3>
                <div className="space-y-2">
                  {locations.map(l => (
                    <label key={l.id} className={'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ' +
                      (form.location_ids.includes(l.id) ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100')}>
                      <input type="checkbox" checked={form.location_ids.includes(l.id)}
                        onChange={() => toggleArr('location_ids', l.id)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                      <div>
                        <span className="text-sm font-medium text-slate-800">📍 {l.name}</span>
                        {l.address && <span className="text-xs text-gray-400 ml-2">— {l.address}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
                {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>)
                  : editing ? 'Guardar Cambios' : 'Crear Servicio'}
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
