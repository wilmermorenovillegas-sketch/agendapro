// ═══════════════════════════════════════════════════════════════
// src/components/booking/StepService.jsx
// Paso 3 — el cliente elige UNO O VARIOS servicios del profesional.
//
// Multi-selección:
//   - Cada servicio es un card con checkbox
//   - Se muestran totales acumulados (tiempo + precio)
//   - Botón "Continuar" habilitado con al menos 1 servicio seleccionado
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Clock, Tag, CheckCircle2, ChevronRight } from 'lucide-react';

const formatPrice = (price, currency = 'PEN') => {
  const n = Number(price || 0);
  if (currency === 'PEN') return `S/ ${n.toFixed(2)}`;
  return `${n.toFixed(2)} ${currency}`;
};

const formatDuration = (minutes) => {
  const m = Number(minutes || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
};

export default function StepService({ services = [], onSelectServices }) {
  // IDs de los servicios seleccionados
  const [selectedIds, setSelectedIds] = useState([]);

  const toggle = (srv) => {
    setSelectedIds((prev) =>
      prev.includes(srv.id)
        ? prev.filter((id) => id !== srv.id)
        : [...prev, srv.id]
    );
  };

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalPrice    = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);

  const handleContinue = () => {
    if (selectedServices.length === 0) return;
    // Preservar el orden en que están en la lista original
    const ordered = services.filter((s) => selectedIds.includes(s.id));
    onSelectServices(ordered);
  };

  if (!services.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Este profesional no tiene servicios disponibles online.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-sora font-bold text-slate-800">
          Elige uno o varios servicios
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Puedes seleccionar más de un servicio en la misma cita.
        </p>
      </div>

      {/* Lista de servicios con checkbox */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((srv) => {
          const isSelected = selectedIds.includes(srv.id);
          return (
            <button
              key={srv.id}
              type="button"
              onClick={() => toggle(srv)}
              className={[
                'text-left rounded-xl p-4 border-2 transition-all',
                isSelected
                  ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                {/* Icono / foto */}
                {srv.photo_url ? (
                  <img
                    src={srv.photo_url}
                    alt={srv.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${srv.color || '#0F766E'}20` }}
                  >
                    <Tag className="w-5 h-5" style={{ color: srv.color || '#0F766E' }} />
                  </div>
                )}

                {/* Datos del servicio */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={[
                      'font-sora font-semibold transition-colors text-sm leading-tight',
                      isSelected ? 'text-teal-800' : 'text-slate-800',
                    ].join(' ')}>
                      {srv.name}
                    </h3>
                    {/* Checkbox visual */}
                    <div className={[
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5',
                      isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300',
                    ].join(' ')}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {srv.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{srv.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(srv.duration_minutes)}
                    </span>
                    <span className="text-sm font-semibold text-teal-700">
                      {formatPrice(srv.price, srv.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de totales y botón Continuar */}
      <div className={[
        'sticky bottom-0 bg-white border rounded-2xl p-4 shadow-lg transition-all',
        selectedServices.length > 0 ? 'border-teal-200' : 'border-gray-200',
      ].join(' ')}>
        {selectedServices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">
            Selecciona al menos un servicio para continuar.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">
                {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''} seleccionado{selectedServices.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDuration(totalDuration)} · <span className="text-teal-700">{formatPrice(totalPrice)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-sora font-semibold text-sm hover:bg-teal-700 transition-colors"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
