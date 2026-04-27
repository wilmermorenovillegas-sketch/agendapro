// ═══════════════════════════════════════════════════════════════
// src/pages/admin/ProfessionalsPage.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import professionalService from '../../services/professionalService';
import locationService from '../../services/locationService';
import ProfessionalScheduleModal from '../../components/admin/ProfessionalScheduleModal';

const COLORS = ['#0F766E','#2563EB','#7C3AED','#DC2626','#EA580C','#CA8A04','#16A34A','#0891B2','#9333EA','#E11D48'];

const EMPTY = {
  email: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', phone: '',
  title: '', specialty: '', bio: '', color: '#0F766E',
  is_active: true, accepts_online: true,
  max_daily_appointments: 20, default_appointment_duration: 30,
  location_ids: [],
};

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY);
  // Modal de horarios
  const [scheduleProf, setScheduleProf] = useState(null);

  const loadData = async () => {
    try {
      const [profs, locs] = await Promise.all([
        professionalService.getAll(),
        locationService.getAll(),
      ]);
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
    setError('');
    setSuccess('');
  };

  const handleEdit = (prof) => {
    setEditing(prof);
    setForm({
      ...EMPTY,
      firstName: prof.first_name || '', lastName: prof.last_name || '',
      phone: prof.phone_number || '', title: prof.title || '',
      specialty: prof.specialty || '', bio: prof.bio || '',
      color: prof.color || '#0F766E', is_active: prof.is_active,
      accepts_online: prof.accepts_online,
      max_daily_appointments: prof.max_daily_appointments || 20,
      default_appointment_duration: prof.default_appointment_duration || 30,
      location_ids: prof.location_ids || [],
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.firstName.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.lastName.trim()) { setError('El apellido es obligatorio.'); return; }

    if (!editing) {
      if (!form.email.trim()) { setError('El correo electrónico es obligatorio.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Ingrese un correo electrónico válido.'); return; }
      if (!form.password) { setError('La contraseña es obligatoria.'); return; }
      if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
      if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden. Verifique e intente de nuevo.'); return; }
    }

    setSaving(true);
    try {
      if (editing) {
        await professionalService.update(editing.id, {
          ...form, profile_id: editing.profile_id,
          first_name: form.firstName, last_name: form.lastName,
          phone_number: form.phone,
        });
        setSuccess(form.firstName + ' ' + form.lastName + ' actualizado exitosamente.');
      } else {
        await professionalService.create({
          email: form.email, password: form.password,
          firstName: form.firstName, lastName: form.lastName,
          phone: form.phone, title: form.title, specialty: form.specialty,
          bio: form.bio, color: form.color, locationIds: form.location_ids,
        });
        setSuccess(form.firstName + ' ' + form.lastName + ' registrado exitosamente. Ya puede iniciar sesión con: ' + form.email);
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

  const handleDelete = async (prof) => {
    if (!confirm('¿Eliminar a ' + prof.full_name + '?')) return;
    try {
      await professionalService.remove(prof.id);
      setSuccess(prof.full_name + ' eliminado.');
      setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const toggleLoc = (locId) => {
    setForm(prev => ({
      ...prev,
      location_ids: prev.location_ids.includes(locId)
        ? prev.location_ids.filter(id => id !== locId)
        : [...prev.location_ids, locId],
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
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Profesionales</h1>
            <p className="text-sm text-gray-400 mt-1">{professionals.length} registrados</p>
          </div>
          {!showForm && (
            <button onClick={handleNew} className="btn-primary px-5 py-2.5">+ Nuevo Profesional</button>
          )}
        </div>

        {/* Mensajes */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}
        {error && !showForm && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>
        )}

        {/* ═══ LISTA ═══ */}
        {!showForm && (
          <>
            {professionals.length === 0 ? (
              <div className="card p-12 text-center">
                <span className="text-4xl mb-4 block">👥</span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No tiene profesionales</h3>
                <p className="text-gray-400 text-sm">
                  Use el botón <strong>"+ Nuevo Profesional"</strong> para registrar a su equipo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {professionals.map((prof) => (
                  <div key={prof.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                             style={{ backgroundColor: prof.color || '#0F766E' }}>
                          {prof.first_name?.[0]}{prof.last_name?.[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">{prof.full_name}</h3>
                            {!prof.is_active && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">Inactivo</span>
                            )}
                          </div>
                          {prof.title && <p className="text-sm text-teal-600 font-medium">{prof.title}</p>}
                          {prof.specialty && <p className="text-sm text-gray-400">{prof.specialty}</p>}
                          {prof.email && <p className="text-xs text-gray-400 mt-1">✉️ {prof.email}</p>}
                          {prof.phone_number && <p className="text-xs text-gray-400">📞 {prof.phone_number}</p>}
                          {prof.location_names?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {prof.location_names.map((name, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">📍 {name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setScheduleProf(prof)} title="Editar horarios"
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-xs font-medium">
                          🕐 Horarios
                        </button>
                        <button onClick={() => handleEdit(prof)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => handleDelete(prof)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ MODAL DE HORARIOS ═══ */}
        {scheduleProf && (
          <ProfessionalScheduleModal
            professional={scheduleProf}
            onClose={() => setScheduleProf(null)}
            onSaved={() => setSuccess(`Horario de ${scheduleProf.full_name || scheduleProf.first_name} guardado.`)}
          />
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
                {editing ? 'Editar Profesional' : 'Nuevo Profesional'}
              </h2>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

            {/* ── CUENTA DE ACCESO (solo al crear) ── */}
            {!editing && (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Cuenta de Acceso al Sistema</h3>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm mb-4">
                  <strong>💡 ¿Para qué es esto?</strong><br/>
                  Cada profesional recibe su propia cuenta para ingresar al sistema y ver sus citas.
                  Use un correo <strong>diferente al suyo</strong> — el correo personal del profesional.
                  Después compártale el correo y contraseña para que inicie sesión.
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Correo del profesional *</label>
                    <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                      placeholder="ejemplo: maria.garcia@correo.com" className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña *</label>
                      <input type="password" value={form.password} onChange={(e) => f('password', e.target.value)}
                        placeholder="Mínimo 8 caracteres" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Confirmar contraseña *</label>
                      <input type="password" value={form.confirmPassword} onChange={(e) => f('confirmPassword', e.target.value)}
                        placeholder="Repita la contraseña"
                        className={'input-field' + (form.confirmPassword && form.password !== form.confirmPassword ? ' input-error' : '')} />
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                      )}
                      {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length >= 8 && (
                        <p className="mt-1 text-xs text-green-600">✓ Las contraseñas coinciden</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DATOS PERSONALES ── */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Datos Personales</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre *</label>
                    <input value={form.firstName} onChange={(e) => f('firstName', e.target.value)}
                      placeholder="María" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Apellido *</label>
                    <input value={form.lastName} onChange={(e) => f('lastName', e.target.value)}
                      placeholder="García" className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Título profesional</label>
                    <input value={form.title} onChange={(e) => f('title', e.target.value)}
                      placeholder="Ej: Dr., Lic., Ing." className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Teléfono</label>
                    <input value={form.phone} onChange={(e) => f('phone', e.target.value)}
                      placeholder="+51 999 999 999" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Especialidad</label>
                  <input value={form.specialty} onChange={(e) => f('specialty', e.target.value)}
                    placeholder="Ej: Dermatología, Consultoría Financiera" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Biografía</label>
                  <textarea value={form.bio} onChange={(e) => f('bio', e.target.value)}
                    rows={3} placeholder="Breve descripción..." className="input-field resize-none" />
                </div>
              </div>
            </div>

            {/* ── CONFIGURACIÓN ── */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Configuración</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Color en calendario</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => f('color', c)} type="button"
                        className={'w-8 h-8 rounded-full transition-transform' + (form.color === c ? ' ring-2 ring-offset-2 ring-teal-500 scale-110' : ' hover:scale-110')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Citas diarias máx.</label>
                    <input type="number" min="1" max="100" value={form.max_daily_appointments}
                      onChange={(e) => f('max_daily_appointments', parseInt(e.target.value) || 20)}
                      className="input-field w-24" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Duración cita (min)</label>
                    <input type="number" min="5" max="480" step="5" value={form.default_appointment_duration}
                      onChange={(e) => f('default_appointment_duration', parseInt(e.target.value) || 30)}
                      className="input-field w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => f('is_active', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                    <span className="text-sm text-gray-600">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.accepts_online} onChange={(e) => f('accepts_online', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                    <span className="text-sm text-gray-600">Acepta citas en línea</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── SEDES ── */}
            {locations.length > 0 && (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Sedes Asignadas</h3>
                <div className="space-y-2">
                  {locations.map(loc => (
                    <label key={loc.id} className={'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ' +
                      (form.location_ids.includes(loc.id) ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100')}>
                      <input type="checkbox" checked={form.location_ids.includes(loc.id)} onChange={() => toggleLoc(loc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600" />
                      <div>
                        <span className="text-sm font-medium text-slate-800">{loc.name}</span>
                        {loc.address && <span className="text-xs text-gray-400 ml-2">— {loc.address}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── BOTONES ── */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                ) : editing ? 'Guardar Cambios' : 'Crear Profesional'}
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
