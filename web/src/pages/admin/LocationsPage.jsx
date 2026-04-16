// ═══════════════════════════════════════════════════════════════
// src/pages/admin/LocationsPage.jsx
// Gestión de Sedes/Locales — CRUD completo
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import locationService from '../../services/locationService';

const EMPTY_LOCATION = {
  name: '',
  description: '',
  address: '',
  district: '',
  city: 'Lima',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  is_active: true,
  max_concurrent_appointments: 1,
  notes: '',
  business_hours: {
    monday:    { open: '09:00', close: '18:00', enabled: true },
    tuesday:   { open: '09:00', close: '18:00', enabled: true },
    wednesday: { open: '09:00', close: '18:00', enabled: true },
    thursday:  { open: '09:00', close: '18:00', enabled: true },
    friday:    { open: '09:00', close: '18:00', enabled: true },
    saturday:  { open: '09:00', close: '13:00', enabled: true },
    sunday:    { open: '00:00', close: '00:00', enabled: false },
  },
};

const DAYS = [
  { key: 'monday', label: 'Lun' }, { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mié' }, { key: 'thursday', label: 'Jue' },
  { key: 'friday', label: 'Vie' }, { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
];

export default function LocationsPage() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_LOCATION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar sedes
  const loadLocations = async () => {
    try {
      const data = await locationService.getAll();
      setLocations(data || []);
    } catch (err) {
      setError('Error cargando sedes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocations(); }, []);

  // Abrir formulario para crear
  const handleNew = () => {
    setEditing(null);
    setFormData(EMPTY_LOCATION);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  // Abrir formulario para editar
  const handleEdit = (location) => {
    setEditing(location.id);
    setFormData({
      name: location.name || '',
      description: location.description || '',
      address: location.address || '',
      district: location.district || '',
      city: location.city || 'Lima',
      phone: location.phone || '',
      email: location.email || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      is_active: location.is_active,
      max_concurrent_appointments: location.max_concurrent_appointments || 1,
      notes: location.notes || '',
      business_hours: location.business_hours || EMPTY_LOCATION.business_hours,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.name.trim()) { setError('El nombre de la sede es obligatorio.'); return; }
    if (!formData.address.trim()) { setError('La dirección es obligatoria.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editing) {
        await locationService.update(editing, payload);
        setSuccess('Sede actualizada.');
      } else {
        await locationService.create(payload);
        setSuccess('Sede creada exitosamente.');
      }
      setShowForm(false);
      await loadLocations();
    } catch (err) {
      setError('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar (soft delete)
  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la sede "${name}"? Esta acción se puede revertir.`)) return;
    try {
      await locationService.remove(id);
      setSuccess('Sede eliminada.');
      await loadLocations();
    } catch (err) {
      setError('Error eliminando: ' + err.message);
    }
  };

  // Marcar como principal
  const handleSetMain = async (id) => {
    try {
      await locationService.setAsMain(id, profile?.tenant_id);
      setSuccess('Sede principal actualizada.');
      await loadLocations();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  // Cambios en formulario
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: { ...prev.business_hours[day], [field]: value },
      },
    }));
  };

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
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Sedes / Locales</h1>
            <p className="text-sm text-gray-400 mt-1">
              {locations.length} {locations.length === 1 ? 'sede registrada' : 'sedes registradas'}
            </p>
          </div>
          <button onClick={handleNew} className="btn-primary px-5 py-2.5">
            + Nueva Sede
          </button>
        </div>

        {/* Mensajes */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}
        {error && !showForm && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Lista de sedes */}
        {!showForm && (
          <>
            {locations.length === 0 ? (
              <div className="card p-12 text-center">
                <span className="text-4xl mb-4 block">📍</span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No tiene sedes registradas</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Agregue su primera sede para empezar a recibir citas.
                </p>
                <button onClick={handleNew} className="btn-primary mx-auto px-6 py-2.5">
                  + Crear Primera Sede
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((loc) => (
                  <div key={loc.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg
                          ${loc.is_active ? 'bg-teal-50' : 'bg-gray-100'}`}>
                          {loc.is_main ? '⭐' : '📍'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">{loc.name}</h3>
                            {loc.is_main && (
                              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full uppercase">
                                Principal
                              </span>
                            )}
                            {!loc.is_active && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">{loc.address}</p>
                          {loc.district && <p className="text-sm text-gray-400">{loc.district}, {loc.city}</p>}
                          {loc.phone && <p className="text-xs text-gray-400 mt-1">{loc.phone}</p>}
                          <div className="flex items-center gap-1 mt-2">
                            {DAYS.map(({ key, label }) => (
                              <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                                ${loc.business_hours?.[key]?.enabled
                                  ? 'bg-teal-50 text-teal-700'
                                  : 'bg-gray-50 text-gray-300'}`}>
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!loc.is_main && (
                          <button onClick={() => handleSetMain(loc.id)}
                            title="Marcar como principal"
                            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors">
                            ⭐
                          </button>
                        )}
                        <button onClick={() => handleEdit(loc)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-sm">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(loc.id, loc.name)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Formulario de creación/edición */}
        {showForm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-slate-800 font-sora">
                {editing ? 'Editar Sede' : 'Nueva Sede'}
              </h2>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Datos básicos */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Datos de la Sede</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre de la sede *</label>
                  <input value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Sede San Isidro" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Descripción</label>
                  <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)}
                    rows={2} placeholder="Descripción breve de la sede..." className="input-field resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Teléfono</label>
                    <input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+51 999 999 999" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="sede@minegocio.com" className="input-field" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ubicación</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Dirección *</label>
                  <input value={formData.address} onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Av. Javier Prado 123" className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Distrito</label>
                    <input value={formData.district} onChange={(e) => handleChange('district', e.target.value)}
                      placeholder="San Isidro" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Ciudad</label>
                    <input value={formData.city} onChange={(e) => handleChange('city', e.target.value)}
                      className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Latitud</label>
                    <input type="number" step="any" value={formData.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                      placeholder="-12.0964" className="input-field font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Longitud</label>
                    <input type="number" step="any" value={formData.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                      placeholder="-77.0428" className="input-field font-mono text-sm" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Puede obtener las coordenadas desde Google Maps: click derecho sobre la ubicación → copiar coordenadas.
                </p>
              </div>
            </div>

            {/* Horarios */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Horario de Atención</h3>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const day = formData.business_hours?.[key] || { open: '09:00', close: '18:00', enabled: false };
                  return (
                    <div key={key} className={`flex items-center gap-4 p-2.5 rounded-lg transition-colors
                      ${day.enabled ? 'bg-teal-50/50' : 'bg-gray-50'}`}>
                      <label className="flex items-center gap-2 w-24 cursor-pointer">
                        <input type="checkbox" checked={day.enabled}
                          onChange={(e) => handleHoursChange(key, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <span className={`text-sm font-medium ${day.enabled ? 'text-slate-800' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </label>
                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <input type="time" value={day.open}
                            onChange={(e) => handleHoursChange(key, 'open', e.target.value)}
                            className="input-field w-28 text-center text-sm py-1.5" />
                          <span className="text-gray-400 text-sm">a</span>
                          <input type="time" value={day.close}
                            onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                            className="input-field w-28 text-center text-sm py-1.5" />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Configuración */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Configuración</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Citas simultáneas máximas
                  </label>
                  <input type="number" min="1" max="50" value={formData.max_concurrent_appointments}
                    onChange={(e) => handleChange('max_concurrent_appointments', parseInt(e.target.value) || 1)}
                    className="input-field w-24" />
                  <p className="text-xs text-gray-400 mt-1">Cuántas citas pueden atenderse al mismo tiempo en esta sede.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  <label className="text-sm text-gray-600">Sede activa (visible para clientes)</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Notas internas</label>
                  <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2} placeholder="Notas visibles solo para administradores..."
                    className="input-field resize-none" />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                ) : editing ? 'Guardar Cambios' : 'Crear Sede'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary px-6 py-3">
                Cancelar
              </button>
            </div>

            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
}
