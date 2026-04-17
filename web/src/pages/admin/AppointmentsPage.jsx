// ═══════════════════════════════════════════════════════════════
// src/pages/admin/AppointmentsPage.jsx
// Vista de Calendario + Motor de Reservas
// - Vista Día (agenda por hora)
// - Vista Mes (cuadrícula)
// - Click en slot vacío → crea cita
// - Click en cita existente → ver/cambiar estado
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import appointmentService from '../../services/appointmentService';
import serviceService from '../../services/serviceService';
import professionalService from '../../services/professionalService';
import locationService from '../../services/locationService';
import clientService from '../../services/clientService';

const STATUS_LABELS = {
  pending:     { label: 'Pendiente',  bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' },
  confirmed:   { label: 'Confirmada', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-400' },
  in_progress: { label: 'En curso',   bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  completed:   { label: 'Completada', bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-400' },
  cancelled:   { label: 'Cancelada',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400' },
  no_show:     { label: 'No asistió', bg: 'bg-gray-200',   text: 'text-gray-600',   border: 'border-gray-400' },
};

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const EMPTY_FORM = {
  client_id: '', service_id: '', professional_id: '', location_id: '',
  date: '', time: '', notes: '',
};

const todayLocal = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
};

const toDateString = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${m}-${dd}`;
};

export default function AppointmentsPage() {
  const [view, setView] = useState('day');
  const [currentDate, setCurrentDate] = useState(todayLocal());
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const loadData = async () => {
    try {
      let startDate, endDate;
      if (view === 'day') {
        const { year, month, day } = currentDate;
        startDate = new Date(year, month, day, 0, 0, 0, 0).toISOString();
        endDate = new Date(year, month, day, 23, 59, 59, 999).toISOString();
      } else {
        const { year, month } = currentDate;
        startDate = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
      }

      const [appts, svcs, profs, locs, cls] = await Promise.all([
        appointmentService.getAll({ startDate, endDate }),
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

  useEffect(() => { loadData(); }, [view, currentDate.year, currentDate.month, currentDate.day]);

  const goToday = () => setCurrentDate(todayLocal());
  const goPrev = () => {
    if (view === 'day') {
      const d = new Date(currentDate.year, currentDate.month, currentDate.day - 1);
      setCurrentDate({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    } else {
      const d = new Date(currentDate.year, currentDate.month - 1, 1);
      setCurrentDate({ year: d.getFullYear(), month: d.getMonth(), day: 1 });
    }
  };
  const goNext = () => {
    if (view === 'day') {
      const d = new Date(currentDate.year, currentDate.month, currentDate.day + 1);
      setCurrentDate({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    } else {
      const d = new Date(currentDate.year, currentDate.month + 1, 1);
      setCurrentDate({ year: d.getFullYear(), month: d.getMonth(), day: 1 });
    }
  };

  const handleNew = (presetDate = null, presetTime = null) => {
    setSelectedAppointment(null);
    setForm({
      ...EMPTY_FORM,
      date: presetDate || toDateString(currentDate.year, currentDate.month, currentDate.day),
      time: presetTime || '',
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
    if (!form.client_id) return setError('Seleccione un cliente.');
    if (!form.service_id) return setError('Seleccione un servicio.');
    if (!form.professional_id) return setError('Seleccione un profesional.');
    if (!form.location_id) return setError('Seleccione una sede.');
    if (!form.date || !form.time) return setError('Seleccione fecha y hora.');

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
      if (newStatus === 'cancelled') reason = prompt('¿Motivo de cancelación?') || '';
      await appointmentService.updateStatus(appt.id, newStatus, reason);
      setSuccess('Estado actualizado.');
      setSelectedAppointment(null);
      setLoading(true);
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const availableProfessionals = selectedService
    ? professionals.filter(p => selectedService.professional_ids?.includes(p.id))
    : professionals;

  const availableLocations = selectedService?.location_ids?.length > 0
    ? locations.filter(l => selectedService.location_ids.includes(l.id))
    : locations;

  const appointmentsByDay = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      const d = new Date(a.start_time);
      const key = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const headerTitle = view === 'day'
    ? `${DAY_NAMES_SHORT[new Date(currentDate.year, currentDate.month, currentDate.day).getDay()]} ${currentDate.day} ${MONTH_NAMES[currentDate.month]} ${currentDate.year}`
    : `${MONTH_NAMES[currentDate.month]} ${currentDate.year}`;

  if (loading) {
    return <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Citas</h1>
            <p className="text-sm text-gray-400 mt-1">{appointments.length} citas · vista {view === 'day' ? 'diaria' : 'mensual'}</p>
          </div>
          {!showForm && !selectedAppointment && (
            <button onClick={() => handleNew()} className="btn-primary px-5 py-2.5">+ Nueva Cita</button>
          )}
        </div>

        {success && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">✓ {success}</div>}
        {error && !showForm && !selectedAppointment && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {!showForm && !selectedAppointment && (
          <>
            <div className="card p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={goPrev} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={goToday} className="btn-secondary px-4 py-2 text-sm">Hoy</button>
                <button onClick={goNext} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-slate-800 font-sora ml-3 capitalize">{headerTitle}</h2>
              </div>

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setView('day')}
                  className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (view === 'day' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  Día
                </button>
                <button onClick={() => setView('month')}
                  className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (view === 'month' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  Mes
                </button>
              </div>
            </div>

            {(locations.length === 0 || professionals.length === 0 || services.length === 0 || clients.length === 0) && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                <strong>⚠ Antes de crear citas, necesita:</strong>
                <ul className="mt-2 space-y-0.5 ml-2">
                  {locations.length === 0 && <li>• Crear al menos una sede</li>}
                  {professionals.length === 0 && <li>• Registrar al menos un profesional</li>}
                  {services.length === 0 && <li>• Crear al menos un servicio</li>}
                  {clients.length === 0 && <li>• Registrar al menos un cliente</li>}
                </ul>
              </div>
            )}

            {view === 'day' && (
              <DayView
                appointments={appointments}
                onSlotClick={(time) => handleNew(toDateString(currentDate.year, currentDate.month, currentDate.day), time)}
                onApptClick={setSelectedAppointment}
              />
            )}

            {view === 'month' && (
              <MonthView
                year={currentDate.year}
                month={currentDate.month}
                appointmentsByDay={appointmentsByDay}
                onDayClick={(day) => {
                  setCurrentDate({ year: currentDate.year, month: currentDate.month, day });
                  setView('day');
                }}
              />
            )}
          </>
        )}

        {selectedAppointment && !showForm && (
          <AppointmentDetail
            appt={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onStatusChange={handleStatusChange}
          />
        )}

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
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Cliente *</label>
                <select value={form.client_id} onChange={(e) => setForm(p => ({ ...p, client_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.phone ? `— ${c.phone}` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Servicio *</label>
                <select value={form.service_id} onChange={(e) => handleServiceChange(e.target.value)} className="input-field">
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes}min — S/ {Number(s.price).toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Sede *</label>
                <select value={form.location_id} onChange={(e) => setForm(p => ({ ...p, location_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione una sede...</option>
                  {availableLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Profesional *</label>
                <select value={form.professional_id} onChange={(e) => setForm(p => ({ ...p, professional_id: e.target.value }))} className="input-field">
                  <option value="">Seleccione un profesional...</option>
                  {availableProfessionals.map(p => <option key={p.id} value={p.id}>{p.full_name} {p.specialty ? `— ${p.specialty}` : ''}</option>)}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
                <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Observaciones sobre esta cita..." className="input-field resize-none" />
              </div>

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
                {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</>) : 'Crear Cita'}
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

function DayView({ appointments, onSlotClick, onApptClick }) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);

  const getApptsAtHour = (h) => appointments.filter(a => {
    const d = new Date(a.start_time);
    return d.getHours() === h;
  });

  return (
    <div className="card overflow-hidden">
      {hours.map(h => {
        const appts = getApptsAtHour(h);
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        const ampm = h < 12 ? 'AM' : 'PM';
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

        return (
          <div key={h} className="flex border-b border-gray-100 last:border-b-0 min-h-[64px]">
            <div className="w-24 flex-shrink-0 p-3 border-r border-gray-100 bg-gray-50">
              <div className="text-sm font-bold text-slate-700">{hour12}:00 {ampm}</div>
            </div>
            <div
              className="flex-1 p-2 hover:bg-teal-50/30 cursor-pointer transition-colors relative group"
              onClick={() => appts.length === 0 && onSlotClick(timeStr)}
            >
              {appts.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs text-teal-600">+ Click para agendar</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {appts.map(a => {
                    const d = new Date(a.start_time);
                    const mins = d.getMinutes();
                    const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
                    return (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onApptClick(a); }}
                        className={`${statusInfo.bg} border-l-4 ${statusInfo.border} rounded-lg p-2.5 hover:shadow-md transition-shadow cursor-pointer`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${statusInfo.text}`}>
                                {String(h).padStart(2,'0')}:{String(mins).padStart(2,'0')}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">
                              {a.clients?.first_name} {a.clients?.last_name}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {a.services?.name} · {a.services?.duration_minutes}min
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-teal-600 whitespace-nowrap">
                            S/ {Number(a.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ year, month, appointmentsByDay, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="min-h-[100px] border-r border-b border-gray-100 bg-gray-50/50" />;
          }
          const dateStr = toDateString(year, month, day);
          const dayAppts = appointmentsByDay[dateStr] || [];
          const isToday = today.year === year && today.month === month && today.day === day;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={'min-h-[100px] border-r border-b border-gray-100 p-1.5 hover:bg-teal-50/50 cursor-pointer transition-colors ' + (isToday ? 'bg-teal-50' : '')}
            >
              <div className={isToday
                ? 'text-sm font-bold mb-1 bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                : 'text-sm font-bold mb-1 text-slate-700'}>
                {day}
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map(a => {
                  const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
                  const d = new Date(a.start_time);
                  const h = d.getHours();
                  const m = d.getMinutes();
                  return (
                    <div key={a.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${statusInfo.bg} ${statusInfo.text} font-medium`}>
                      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')} {a.clients?.first_name}
                    </div>
                  );
                })}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-gray-500 font-medium">+ {dayAppts.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentDetail({ appt, onClose, onStatusChange }) {
  const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.pending;
  const startDate = new Date(appt.start_time);

  const formatDateTime = (d) => d.toLocaleString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-slate-800 font-sora">Detalle de Cita</h2>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}>
            {statusInfo.label}
          </span>
          <span className="text-2xl font-bold text-teal-600">S/ {Number(appt.price).toFixed(2)}</span>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cliente</h3>
          <p className="text-lg font-bold text-slate-800">{appt.clients?.first_name} {appt.clients?.last_name}</p>
          {appt.clients?.phone && <p className="text-sm text-gray-500">📞 {appt.clients.phone}</p>}
          {appt.clients?.email && <p className="text-sm text-gray-500">✉️ {appt.clients.email}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Servicio</h3>
          <p className="text-base font-bold text-slate-800">{appt.services?.name}</p>
          <p className="text-sm text-gray-500">{appt.services?.duration_minutes} minutos</p>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sede</h3>
            <p className="text-sm text-slate-800">📍 {appt.locations?.name}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Horario</h3>
            <p className="text-sm text-slate-800 capitalize">{formatDateTime(startDate)}</p>
          </div>
        </div>

        {appt.notes && (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notas</h3>
            <p className="text-sm text-slate-700 italic">"{appt.notes}"</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cambiar estado</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {appt.status === 'pending' && (
            <button onClick={() => onStatusChange(appt, 'confirmed')}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
              ✓ Confirmar
            </button>
          )}
          {appt.status === 'confirmed' && (
            <button onClick={() => onStatusChange(appt, 'in_progress')}
              className="px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium">
              ▶ Marcar en curso
            </button>
          )}
          {['confirmed', 'in_progress'].includes(appt.status) && (
            <button onClick={() => onStatusChange(appt, 'completed')}
              className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium">
              ✓ Completar
            </button>
          )}
          {['pending', 'confirmed'].includes(appt.status) && (
            <button onClick={() => onStatusChange(appt, 'no_show')}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              ✗ No asistió
            </button>
          )}
          {['pending', 'confirmed'].includes(appt.status) && (
            <button onClick={() => onStatusChange(appt, 'cancelled')}
              className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium">
              ✗ Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
