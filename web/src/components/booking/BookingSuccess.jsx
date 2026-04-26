// ═══════════════════════════════════════════════════════════════
// src/components/booking/BookingSuccess.jsx
// Pantalla final cuando la cita se crea con exito.
// Muestra resumen y boton para volver a empezar el flujo.
// ═══════════════════════════════════════════════════════════════

import { CheckCircle2, Calendar, MapPin, User, Tag } from 'lucide-react';

const formatStartTime = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const date = d.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
  const time = d.toLocaleTimeString('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Lima',
  });
  return `${date} · ${time}`;
};

export default function BookingSuccess({
  appointmentId,
  startTime,
  serviceName,
  professionalName,
  locationName,
  onBookAnother,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-10 text-center space-y-6 max-w-xl mx-auto">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-sora font-bold text-slate-800">
          ¡Cita solicitada con éxito!
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Recibirás confirmación pronto. El negocio revisará tu pago y se contactará contigo.
        </p>
      </div>

      <div className="rounded-xl p-4 text-left space-y-3" style={{ backgroundColor: '#F4F6F8' }}>
        <div className="flex items-start gap-3">
          <Tag className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-sora">Servicio</p>
            <p className="text-sm font-medium text-slate-800">{serviceName || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-sora">Profesional</p>
            <p className="text-sm font-medium text-slate-800">{professionalName || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-sora">Fecha y hora</p>
            <p className="text-sm font-medium text-slate-800 capitalize">
              {formatStartTime(startTime)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-sora">Sede</p>
            <p className="text-sm font-medium text-slate-800">{locationName || '—'}</p>
          </div>
        </div>
      </div>

      {appointmentId && (
        <p className="text-[11px] text-gray-400 font-mono">
          Código: {appointmentId.slice(0, 8)}
        </p>
      )}

      <button
        type="button"
        onClick={onBookAnother}
        className="w-full py-3 rounded-xl font-sora font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        Agendar otra cita
      </button>
    </div>
  );
}
