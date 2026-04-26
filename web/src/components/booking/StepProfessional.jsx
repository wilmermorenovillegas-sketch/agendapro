// ═══════════════════════════════════════════════════════════════
// src/components/booking/StepProfessional.jsx
// Paso 2 — el cliente elige un profesional dentro de la sede seleccionada.
// ═══════════════════════════════════════════════════════════════

import { User } from 'lucide-react';

export default function StepProfessional({ professionals = [], onSelectProfessional }) {
  if (!professionals.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No hay profesionales disponibles en esta sede.</p>
        <p className="text-xs mt-1">Intenta con otra sede o contacta al negocio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-sora font-bold text-slate-800">
          Elige un profesional
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona quién te atenderá.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {professionals.map((pro) => {
          const fullName = `${pro.first_name || ''} ${pro.last_name || ''}`.trim() || 'Profesional';
          const initials = `${(pro.first_name || '?')[0]}${(pro.last_name || '')[0] || ''}`.toUpperCase();

          return (
            <button
              key={pro.id}
              type="button"
              onClick={() => onSelectProfessional(pro)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                {pro.profile_photo_url ? (
                  <img
                    src={pro.profile_photo_url}
                    alt={fullName}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{ backgroundColor: pro.color || '#0F766E' }}
                  >
                    {initials || <User className="w-6 h-6" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-sora font-semibold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                    {pro.title ? `${pro.title} ` : ''}
                    {fullName}
                  </h3>
                  {pro.specialty && (
                    <p className="text-sm text-gray-600 truncate">{pro.specialty}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pro.services?.length || 0}{' '}
                    {pro.services?.length === 1 ? 'servicio' : 'servicios'} disponibles
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
