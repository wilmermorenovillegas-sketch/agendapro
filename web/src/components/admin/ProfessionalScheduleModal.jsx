// ═══════════════════════════════════════════════════════════════
// src/components/admin/ProfessionalScheduleModal.jsx
// Modal para editar el horario semanal de un profesional.
//
// Muestra 7 días (Lunes→Domingo), cada uno con:
//   - Toggle activo/inactivo
//   - Hora inicio (time input)
//   - Hora fin   (time input)
//
// Al guardar llama a professionalService.saveSchedule(), que borra
// los horarios generales existentes y los reemplaza.
//
// day_of_week usa convención JS / PostgreSQL EXTRACT(DOW):
//   0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles,
//   4=Jueves, 5=Viernes, 6=Sábado
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { X, Save, Loader2, Clock, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import professionalService from '../../services/professionalService';

// Orden de visualización L→D
const DAYS = [
  { dow: 1, label: 'Lunes',     short: 'Lu' },
  { dow: 2, label: 'Martes',    short: 'Ma' },
  { dow: 3, label: 'Miércoles', short: 'Mi' },
  { dow: 4, label: 'Jueves',    short: 'Ju' },
  { dow: 5, label: 'Viernes',   short: 'Vi' },
  { dow: 6, label: 'Sábado',    short: 'Sá' },
  { dow: 0, label: 'Domingo',   short: 'Do' },
];

// Horario por defecto cuando no hay datos en BD
const buildDefaultSchedule = () =>
  DAYS.map(({ dow }) => ({
    day_of_week: dow,
    start_time: dow === 6 ? '09:00' : '09:00',
    end_time:   dow === 6 ? '13:00' : '18:00',
    is_active:  dow !== 0,   // domingo cerrado por defecto
  }));

export default function ProfessionalScheduleModal({ professional, onClose, onSaved }) {
  const [schedule, setSchedule] = useState(buildDefaultSchedule());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ─── Cargar horario existente ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await professionalService.getSchedule(professional.id);
        if (cancelled) return;

        if (rows.length > 0) {
          // Merge: mantener los 7 días del template y pisar con datos de BD
          setSchedule(
            DAYS.map(({ dow }) => {
              const row = rows.find((r) => r.day_of_week === dow);
              return row
                ? { day_of_week: dow, start_time: row.start_time.slice(0, 5),
                    end_time: row.end_time.slice(0, 5), is_active: row.is_active }
                : { day_of_week: dow, start_time: '09:00', end_time: '18:00', is_active: false };
            })
          );
        }
        // Si no hay filas en BD, dejamos el default ya puesto
      } catch (err) {
        toast.error('No se pudo cargar el horario: ' + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [professional.id]);

  // ─── Helpers de edición ────────────────────────────────────────
  const updateDay = (dow, field, value) =>
    setSchedule((prev) =>
      prev.map((d) => d.day_of_week === dow ? { ...d, [field]: value } : d)
    );

  // Copiar horario del primer día activo a todos los días activos
  const copyToAll = () => {
    const first = schedule.find((d) => d.is_active);
    if (!first) return;
    setSchedule((prev) =>
      prev.map((d) =>
        d.is_active ? { ...d, start_time: first.start_time, end_time: first.end_time } : d
      )
    );
    toast.success('Horario copiado a todos los días activos');
  };

  // ─── Validación ────────────────────────────────────────────────
  const validate = () => {
    for (const d of schedule) {
      if (!d.is_active) continue;
      if (!d.start_time || !d.end_time) return 'Completa todos los horarios de los días activos.';
      if (d.start_time >= d.end_time)
        return `En ${DAYS.find((x) => x.dow === d.day_of_week)?.label}: la hora de entrada debe ser menor que la de salida.`;
    }
    return null;
  };

  // ─── Guardar ───────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      await professionalService.saveSchedule(professional.id, schedule);
      toast.success('Horario guardado correctamente');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeDaysCount = schedule.filter((d) => d.is_active).length;

  // ═══════════════ RENDER ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                 style={{ backgroundColor: professional.color || '#0F766E' }}>
              {professional.first_name?.[0]}{professional.last_name?.[0]}
            </div>
            <div>
              <h2 className="font-sora font-bold text-slate-800 text-base">
                Horario de {professional.full_name || `${professional.first_name} ${professional.last_name}`}
              </h2>
              <p className="text-xs text-gray-400">
                {activeDaysCount} día{activeDaysCount !== 1 ? 's' : ''} activo{activeDaysCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Botón "copiar a todos" */}
              {activeDaysCount > 1 && (
                <button type="button" onClick={copyToAll}
                  className="flex items-center gap-2 text-xs text-teal-700 hover:text-teal-900 font-medium px-3 py-1.5 bg-teal-50 rounded-lg transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                  Copiar horario del primer día activo a todos
                </button>
              )}

              {/* Filas por día */}
              {DAYS.map(({ dow, label, short }) => {
                const day = schedule.find((d) => d.day_of_week === dow);
                if (!day) return null;
                const isWeekend = dow === 0 || dow === 6;

                return (
                  <div key={dow}
                    className={[
                      'rounded-xl border p-3 transition-colors',
                      day.is_active
                        ? 'border-teal-200 bg-teal-50/40'
                        : 'border-gray-200 bg-gray-50/60',
                    ].join(' ')}>
                    <div className="flex items-center gap-3">
                      {/* Toggle + nombre día */}
                      <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                        <div className="relative">
                          <input type="checkbox" className="sr-only"
                            checked={day.is_active}
                            onChange={(e) => updateDay(dow, 'is_active', e.target.checked)} />
                          <div className={[
                            'w-9 h-5 rounded-full transition-colors',
                            day.is_active ? 'bg-teal-600' : 'bg-gray-300',
                          ].join(' ')} />
                          <div className={[
                            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                            day.is_active ? 'translate-x-4' : '',
                          ].join(' ')} />
                        </div>
                        <span className={[
                          'text-sm font-medium',
                          day.is_active ? 'text-slate-800' : 'text-gray-400',
                          isWeekend ? 'font-semibold' : '',
                        ].join(' ')}>
                          {label}
                        </span>
                      </label>

                      {/* Inputs de hora */}
                      {day.is_active ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Clock className="w-4 h-4 text-teal-500 shrink-0" />
                          <input
                            type="time"
                            value={day.start_time}
                            onChange={(e) => updateDay(dow, 'start_time', e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm text-slate-700"
                          />
                          <span className="text-gray-400 text-xs shrink-0">a</span>
                          <input
                            type="time"
                            value={day.end_time}
                            onChange={(e) => updateDay(dow, 'end_time', e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm text-slate-700"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 ml-2">Cerrado</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Aviso informativo */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
                <strong>💡 Este horario</strong> determina los slots disponibles en la página pública
                de reservas cuando el cliente elija a este profesional.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={handleSave} disabled={saving || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 text-white rounded-xl font-sora font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="w-4 h-4" />Guardar horario</>
            )}
          </button>
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
