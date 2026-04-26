// ═══════════════════════════════════════════════════════════════
// src/components/booking/StepService.jsx
// Paso 3 — el cliente elige uno de los servicios del profesional.
// Muestra duracion en minutos y precio en PEN (formato "S/ 50").
// ═══════════════════════════════════════════════════════════════

import { Clock, Tag } from 'lucide-react';

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

export default function StepService({ services = [], onSelectService }) {
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
          Elige un servicio
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona el servicio que necesitas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((srv) => (
          <button
            key={srv.id}
            type="button"
            onClick={() => onSelectService(srv)}
            className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              {srv.photo_url ? (
                <img
                  src={srv.photo_url}
                  alt={srv.name}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${srv.color || '#0F766E'}20` }}
                >
                  <Tag className="w-6 h-6" style={{ color: srv.color || '#0F766E' }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-sora font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                  {srv.name}
                </h3>
                {srv.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {srv.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
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
        ))}
      </div>
    </div>
  );
}
