// ═══════════════════════════════════════════════════════════════
// src/pages/admin/AppointmentsPage.jsx
// Motor de Reservas - vista de lista + formulario de nueva cita
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import appointmentService from '../../services/appointmentService';
import serviceService from '../../services/serviceService';
import professionalService from '../../services/professionalService';
import locationService from '../../services/locationService';
import clientService from '../../services/clientService';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En curso', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'No asistió', color: 'bg-gray-200 text-gray-600' },
};

const EMPTY_FORM = {
  client_id: '',
  service_id: '',
  professional_id: '',
  location_id: '',
  date: '',
  time: '',
  notes: '',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedService, setSelectedService] = useState(null);
  const [filterDate, setFilterDate] = useState(() => {
    // Fecha de hoy en zona horaria local (no UTC)
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const loadData = async () => {
    try {
      // Parsear fecha del filtro respetando zona horaria local (Lima)
      // filterDate viene como "YYYY-MM-DD" — lo tratamos como fecha local, no UTC
      const [year, month, day] = filterDate.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);

      const [appts, svcs, profs, locs, cls] = await Promise.all([
        appointmentService.getAll({ startDate: start.toISOString(), endDate: end.toISOString() }),
        serviceService.getAll(),
        professionalService.getAll(),
        locationService.getAll(),
        clientService.getAll(),
      ]);
      setAppointments(appts || []);
      setServices(svcs || []);
      setProfessionals(profs || []);
      setLocations(locs || []);
      setClients(cls || []);
    } catch (err) {
      setError('Error cargando datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterDate]);

  const handleNew = () => {
    setForm({
      ...EMPTY_FORM,
      date: filterDate,
      location_id: locations[0]?.id || '',
    });
    setSelectedService(null);
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleServiceChange = (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    setSelectedService(svc);
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      professional_id: svc?.professional_ids?.[0] || '',
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.client_id) { setError('Seleccione un cliente.'); return; }
    if (!form.service_id) { setError('Seleccione un servicio.'); return; }
    if (!form.professional_id) { setError('Seleccione un profesional.'); return; }
    if (!form.location_id) { setError('Seleccione una sede.'); return; }
    if (!form.date || !form.time) { setError('Seleccione fecha y hora.'); return; }

    setSaving(true);
    try {
      const startDateTime = new Date(`${form.date}T${form.time}:00`);
      await appointmentService.create({
        location_id: form.location_id,
        professional_id: form.professional_id,
        service_id: form.service_id,
        client_id: form.client_id,
        start_time: startDateTime.toISOString(),
        duration_minutes: selectedService?.duration_minutes || 30,
        price: selectedService?.price || 0,
        notes: form.notes,
      });
      setSuccess('Cita creada exitosamente.');
      setShowForm(false);
      setLoading(true);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (appt, newStatus) => {
    try {
      let reason = '';
      if (newStatus === 'cancelled') {
        reason = prompt('¿Motivo de cancelación?') || '';
      }
      await appointmentService.updateStatus(appt.id, newStatus, reason);
      setSuccess('Estado actualizado.');
      setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Filtrar profesionales disponibles según servicio seleccionado
  const availableProfessionals = selectedService
    ? professionals.filter(p => selectedService.professional_ids?.includes(p.id))
    : professionals;

  // Filtrar sedes disponibles según servicio
  const availableLocations = selectedService?.location_ids?.length > 0
    ? locations.filter(l => selectedService.location_ids.includes(l.id))
    : locations;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Citas</h1>
            <p className="text-sm text-gray-400 mt-1">{appointments.length} citas en la fecha seleccionada</p>
          </div>
          {!showForm && (
            <button onClick={handleNew} className="btn-primary px-5 py-2.5">+ Nueva Cita</button>
          )}
        </div>

        {success && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">✓ {success}</div>}
        {error && !showForm && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {!showForm && (
          <>
            {/* Filtro de fecha */}
            <div className="card p-4 mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">📅 Fecha:</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                className="input-field flex-1 max-w-xs" />
              <button onClick={() => {
                const d = new Date();
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setFilterDate(`${y}-${m}-${day}`);
              }}
                className="btn-secondary px-4 py-2 text-sm">Hoy</button>
            </div>

            {/* Lista */}
            {appointments.length === 0 ? (
              <div className="card p-12 text-center">
                <span className="text-4xl mb-4 block">📅</span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Sin citas para esta fecha</h3>
                <p className="text-gray-400 text-sm mb-4">Los requisitos previos son: tener sedes, profesionales, servicios y clientes registrados.</p>
                {(locations.length === 0 || professionals.length === 0 || services.length === 0 || clients.length === 0) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm text-left max-w-md mx-auto">
                    <strong>Antes de crear citas necesita:</strong>
                    <ul className="mt-2 space-y-1">
                      {locations.length === 0 && <li>❌ Crear al menos una sede</li>}
                      {professionals.length === 0 && <li>❌ Registrar al menos un profesional</li>}
                      {services.length === 0 && <li>❌ Crear al menos un servicio</li>}
                      {clients.length === 0 && <li>❌ Registrar al menos un cliente</li>}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => {
                  const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
                  return (
                    <div key={a.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800 font-sora">{formatTime(a.start_time)}</div>
                            <div className="text-xs text-gray-400">{a.services?.duration_minutes} min</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-800">{a.clients?.first_name} {a.clients?.last_name}</h3>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-teal-600 font-medium mt-1">{a.services?.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              <span>📍 {a.locations?.name}</span>
                              {a.clients?.phone && <span>📞 {a.clients.phone}</span>}
                              <span className="font-semibold text-teal-600">S/ {Number(a.price).toFixed(2)}</span>
                            </div>
                            {a.notes && <p className="text-xs text-gray-400 mt-2 italic">"{a.notes}"</p>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {a.status === 'pending' && (
                            <button onClick={() => handleStatusChange(a, 'confirmed')}
                              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Confirmar</button>
                          )}
                          {a.status === 'confirmed' && (
                            <button onClick={() => handleStatusChange(a, 'completed')}
                              className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Completar</button>
                          )}
                          {['pending', 'confirmed'].includes(a.status) && (
                            <button onClick={() => handleStatusChange(a, 'cancelled')}
                              className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Cancelar</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* FORMULARIO */}
        {showForm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-slate-800 font-sora">Nueva Cita</h2>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

            <div className="card p-6 space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Cliente *</label>
                <select value={form.client_id} onChange={(e) => setForm(p => ({ ...p, client_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.phone ? `— ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">⚠ No hay clientes registrados. Regístrelos primero.</p>
                )}
              </div>

              {/* Servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Servicio *</label>
                <select value={form.service_id} onChange={(e) => handleServiceChange(e.target.value)} className="input-field">
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.duration_minutes}min — S/ {Number(s.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sede */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Sede *</label>
                <select value={form.location_id} onChange={(e) => setForm(p => ({ ...p, location_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione una sede...</option>
                  {availableLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Profesional */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Profesional *</label>
                <select value={form.professional_id} onChange={(e) => setForm(p => ({ ...p, professional_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione un profesional...</option>
                  {availableProfessionals.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} {p.specialty ? `— ${p.specialty}` : ''}</option>
                  ))}
                </select>
                {selectedService && availableProfessionals.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠ Ningún profesional asignado a este servicio. Edite el servicio para asignar profesionales.</p>
                )}
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Fecha *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Hora *</label>
                  <input type="time" value={form.time} onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))} className="input-field" />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
                <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Observaciones sobre esta cita..." className="input-field resize-none" />
              </div>

              {/* Resumen */}
              {selectedService && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <h4 className="text-sm font-bold text-teal-800 mb-2">Resumen</h4>
                  <div className="text-sm text-teal-700 space-y-1">
                    <p>Servicio: <strong>{selectedService.name}</strong></p>
                    <p>Duración: <strong>{selectedService.duration_minutes} minutos</strong></p>
                    <p>Precio: <strong>S/ {Number(selectedService.price).toFixed(2)}</strong></p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
                {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</>)
                  : 'Crear Cita'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary px-6 py-3">Cancelar</button>
            </div>

            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
}
