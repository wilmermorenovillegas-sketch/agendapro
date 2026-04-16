// ═══════════════════════════════════════════════════════════════
// src/pages/admin/BusinessSettingsPage.jsx
// Configuración del negocio — solo Admin
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import tenantService from '../../services/tenantService';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function BusinessSettingsPage() {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  const [tenant, setTenant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // Cargar datos del tenant y categorías
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantData, cats] = await Promise.all([
          tenantService.getMyTenant(),
          tenantService.getCategories(),
        ]);
        setTenant(tenantData);
        setCategories(cats);
      } catch (err) {
        setError('Error cargando datos del negocio: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Manejar cambios en campos
  const handleChange = (field, value) => {
    setTenant((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  // Manejar cambios en horarios
  const handleHoursChange = (day, field, value) => {
    setTenant((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: { ...prev.business_hours[day], [field]: value },
      },
    }));
    setSuccess('');
  };

  // Guardar cambios
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await tenantService.updateTenant(tenant.id, {
        business_name: tenant.business_name,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        city: tenant.city,
        district: tenant.district,
        description: tenant.description,
        category: tenant.category,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        business_hours: tenant.business_hours,
        appointment_buffer_minutes: tenant.appointment_buffer_minutes,
        max_advance_booking_days: tenant.max_advance_booking_days,
        cancellation_policy_hours: tenant.cancellation_policy_hours,
        welcome_message: tenant.welcome_message,
      });
      setSuccess('Cambios guardados exitosamente.');
    } catch (err) {
      setError('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Subir logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El logo no puede pesar más de 5MB.');
      return;
    }

    setUploadingLogo(true);
    setError('');
    try {
      const url = await tenantService.uploadLogo(tenant.id, file);
      setTenant((prev) => ({ ...prev, logo_url: url }));
      setSuccess('Logo actualizado.');
    } catch (err) {
      setError('Error subiendo logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500">No se encontró información del negocio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo del negocio */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer
                           hover:opacity-80 transition-opacity overflow-hidden border-2 border-dashed border-gray-200"
                style={{ backgroundColor: tenant.primary_color + '15' }}
              >
                {uploadingLogo ? (
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                ) : tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📷</span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <div>
                <h1 className="text-xl font-bold text-slate-800 font-sora">{tenant.business_name}</h1>
                <p className="text-sm text-gray-400">Configuración del negocio</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2.5">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
              ) : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {[
            { id: 'general', label: 'General' },
            { id: 'hours', label: 'Horarios' },
            { id: 'booking', label: 'Reservas' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: General ═══ */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Datos del Negocio</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre del negocio</label>
                  <input value={tenant.business_name} onChange={(e) => handleChange('business_name', e.target.value)}
                         className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Descripción</label>
                  <textarea value={tenant.description || ''} onChange={(e) => handleChange('description', e.target.value)}
                            rows={3} placeholder="Describe brevemente tu negocio..."
                            className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Categoría</label>
                  <select value={tenant.category} onChange={(e) => handleChange('category', e.target.value)}
                          className="input-field">
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email de contacto</label>
                    <input type="email" value={tenant.email || ''} onChange={(e) => handleChange('email', e.target.value)}
                           placeholder="contacto@minegocio.com" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Teléfono</label>
                    <input type="tel" value={tenant.phone || ''} onChange={(e) => handleChange('phone', e.target.value)}
                           placeholder="+51 999 999 999" className="input-field" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ubicación</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Dirección</label>
                  <input value={tenant.address || ''} onChange={(e) => handleChange('address', e.target.value)}
                         placeholder="Jr. Ejemplo 123" className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Distrito</label>
                    <input value={tenant.district || ''} onChange={(e) => handleChange('district', e.target.value)}
                           placeholder="San Isidro" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Ciudad</label>
                    <input value={tenant.city || ''} onChange={(e) => handleChange('city', e.target.value)}
                           className="input-field" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Personalización</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Color primario</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={tenant.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)}
                           className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                    <input value={tenant.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)}
                           className="input-field flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Color secundario</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={tenant.secondary_color} onChange={(e) => handleChange('secondary_color', e.target.value)}
                           className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                    <input value={tenant.secondary_color} onChange={(e) => handleChange('secondary_color', e.target.value)}
                           className="input-field flex-1 font-mono text-sm" />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="mt-4 p-4 rounded-xl flex items-center gap-3"
                   style={{ backgroundColor: tenant.primary_color }}>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{tenant.business_name?.[0]}</span>
                </div>
                <span className="text-white font-semibold text-sm">{tenant.business_name}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Horarios ═══ */}
        {activeTab === 'hours' && (
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Horario de Atención</h3>
            <div className="space-y-3">
              {DAYS.map(({ key, label }) => {
                const day = tenant.business_hours?.[key] || { open: '09:00', close: '18:00', enabled: false };
                return (
                  <div key={key} className={`flex items-center gap-4 p-3 rounded-xl transition-colors
                    ${day.enabled ? 'bg-teal-50/50' : 'bg-gray-50'}`}>
                    <label className="flex items-center gap-3 w-32 cursor-pointer">
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
                               className="input-field w-32 text-center text-sm py-2" />
                        <span className="text-gray-400 text-sm">a</span>
                        <input type="time" value={day.close}
                               onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                               className="input-field w-32 text-center text-sm py-2" />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Cerrado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: Reservas ═══ */}
        {activeTab === 'booking' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Políticas de Reserva</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Tiempo entre citas (minutos)
                  </label>
                  <input type="number" min="0" max="60" value={tenant.appointment_buffer_minutes}
                         onChange={(e) => handleChange('appointment_buffer_minutes', parseInt(e.target.value) || 0)}
                         className="input-field w-32" />
                  <p className="text-xs text-gray-400 mt-1">Tiempo de descanso entre una cita y la siguiente.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Anticipación máxima de reserva (días)
                  </label>
                  <input type="number" min="1" max="365" value={tenant.max_advance_booking_days}
                         onChange={(e) => handleChange('max_advance_booking_days', parseInt(e.target.value) || 30)}
                         className="input-field w-32" />
                  <p className="text-xs text-gray-400 mt-1">¿Con cuántos días de anticipación pueden agendar?</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Política de cancelación (horas)
                  </label>
                  <input type="number" min="0" max="72" value={tenant.cancellation_policy_hours}
                         onChange={(e) => handleChange('cancellation_policy_hours', parseInt(e.target.value) || 24)}
                         className="input-field w-32" />
                  <p className="text-xs text-gray-400 mt-1">Horas de anticipación mínima para cancelar sin penalización.</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Mensaje de Bienvenida</h3>
              <textarea value={tenant.welcome_message || ''} onChange={(e) => handleChange('welcome_message', e.target.value)}
                        rows={3} placeholder="Mensaje que verán los clientes al agendar..."
                        className="input-field resize-none" />
              <p className="text-xs text-gray-400 mt-1">Se muestra a los clientes en la página de reserva.</p>
            </div>
          </div>
        )}

        {/* Spacer bottom */}
        <div className="h-8" />
      </div>
    </div>
  );
}
