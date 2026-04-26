// ═══════════════════════════════════════════════════════════════
// src/components/booking/StepLocation.jsx
// Paso 1 — el cliente elige una sede.
// Si solo hay 1 sede activa, el padre puede auto-saltar este paso.
// ═══════════════════════════════════════════════════════════════

import { MapPin, Phone } from 'lucide-react';

export default function StepLocation({ locations = [], onSelectLocation }) {
  if (!locations.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No hay sedes disponibles en este momento.</p>
        <p className="text-xs mt-1">Contacta al negocio o intenta más tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-sora font-bold text-slate-800">
          Elige una sede
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona el local donde deseas atenderte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => onSelectLocation(loc)}
            className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              {loc.photo_url ? (
                <img
                  src={loc.photo_url}
                  alt={loc.name}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-teal-600" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-sora font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                  {loc.name}
                </h3>
                {loc.address && (
                  <p className="text-sm text-gray-600 mt-0.5 truncate">
                    {loc.address}
                    {loc.district ? `, ${loc.district}` : ''}
                  </p>
                )}
                {loc.phone && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {loc.phone}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
