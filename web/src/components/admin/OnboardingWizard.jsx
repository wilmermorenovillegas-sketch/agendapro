// ═══════════════════════════════════════════════════════════════
// src/components/admin/OnboardingWizard.jsx
// Wizard de configuración inicial para nuevos tenants.
//
// Pasos:
//   1. ¿Qué tipo de negocio tienes? (seleccionar categoría)
//   2. Servicios sugeridos para tu categoría (seleccionar cuáles importar)
//   3. ¡Todo listo! (pantalla de éxito con links de acción)
//
// Trigger: se muestra desde DashboardPage cuando no hay servicios
//          y el tenant no ha completado el onboarding (localStorage).
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import serviceService from '../../services/serviceService';
import SERVICE_TEMPLATES from '../../data/serviceTemplates';

// Categorías de negocio (sincronizadas con business_categories en BD)
const CATEGORIES = [
  { id: 'beauty',      name: 'Belleza y Estética',  icon: '💇' },
  { id: 'dental',      name: 'Odontología',          icon: '🦷' },
  { id: 'health',      name: 'Salud y Medicina',     icon: '🏥' },
  { id: 'therapy',     name: 'Terapia y Bienestar',  icon: '🧘' },
  { id: 'fitness',     name: 'Fitness y Deporte',    icon: '🏋️' },
  { id: 'consulting',  name: 'Consultoría',          icon: '💼' },
  { id: 'accounting',  name: 'Contabilidad',         icon: '📊' },
  { id: 'education',   name: 'Educación',            icon: '📚' },
  { id: 'legal',       name: 'Servicios Legales',    icon: '⚖️' },
  { id: 'veterinary',  name: 'Veterinaria',          icon: '🐾' },
  { id: 'photography', name: 'Fotografía',           icon: '📸' },
  { id: 'automotive',  name: 'Automotriz',           icon: '🚗' },
  { id: 'real_estate', name: 'Inmobiliaria',         icon: '🏠' },
  { id: 'general',     name: 'General / Otros',      icon: '🏢' },
];

export default function OnboardingWizard({ tenantId, tenantSlug, onClose, onComplete }) {
  const [step, setStep]               = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  // Mapa: index → { ...template, selected: bool, price: editable }
  const [services, setServices]       = useState([]);
  const [importing, setImporting]     = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ─── Paso 1 → 2: elegir categoría y cargar plantillas ─────────
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    const templates = SERVICE_TEMPLATES[cat.id] || SERVICE_TEMPLATES.general;
    setServices(
      templates.map((t, i) => ({ ...t, id: i, selected: true }))
    );
    setStep(2);
  };

  // ─── Paso 2: toggle de selección ─────────────────────────────
  const toggleService = (id) =>
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );

  const updatePrice = (id, value) =>
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price: parseFloat(value) || 0 } : s))
    );

  const selectedCount = services.filter((s) => s.selected).length;

  // ─── Paso 2 → 3: importar servicios ──────────────────────────
  const handleImport = async () => {
    const toImport = services.filter((s) => s.selected);
    if (toImport.length === 0) {
      toast.error('Selecciona al menos un servicio para continuar.');
      return;
    }
    setImporting(true);
    try {
      await Promise.all(
        toImport.map((s) =>
          serviceService.create({
            name:             s.name,
            description:      s.description || '',
            duration_minutes: s.duration_minutes,
            price:            s.price,
            cost:             0,
            currency:         'PEN',
            color:            s.color,
            accepts_online:   true,
            requires_payment: false,
            buffer_minutes:   0,
            is_active:        true,
          })
        )
      );
      setImportedCount(toImport.length);
      setStep(3);
      onComplete?.(); // notifica al dashboard que ya hay servicios
    } catch (err) {
      toast.error('Error al importar servicios: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // ─── Cierre y marcado en localStorage ─────────────────────────
  const handleClose = () => {
    if (tenantId) {
      localStorage.setItem(`agendapro_onboarding_v1_${tenantId}`, 'done');
    }
    onClose?.();
  };

  const bookingUrl = tenantSlug ? `${window.location.origin}/book/${tenantSlug}` : null;

  // ═══════════════ RENDER ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-sora font-bold text-white text-base">
                Configuración inicial
              </h2>
              <p className="text-teal-100 text-xs">Paso {step} de 3</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Barra de progreso ── */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ PASO 1: Categoría ══ */}
          {step === 1 && (
            <div className="p-6">
              <h3 className="font-sora font-bold text-slate-800 text-xl mb-1">
                ¿Qué tipo de negocio tienes?
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Elige tu categoría para cargar servicios sugeridos automáticamente.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-left transition-all group"
                  >
                    <span className="text-2xl shrink-0">{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-teal-800 leading-tight">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ PASO 2: Servicios sugeridos ══ */}
          {step === 2 && selectedCategory && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{selectedCategory.icon}</span>
                <h3 className="font-sora font-bold text-slate-800 text-xl">
                  Servicios para {selectedCategory.name}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Selecciona los servicios que ofreces. Podrás editar precios y agregar más después.
              </p>

              {/* Acciones rápidas */}
              <div className="flex gap-2 mb-4">
                <button type="button"
                  onClick={() => setServices((p) => p.map((s) => ({ ...s, selected: true })))}
                  className="text-xs text-teal-700 hover:text-teal-900 font-medium px-3 py-1.5 bg-teal-50 rounded-lg">
                  ✓ Seleccionar todos
                </button>
                <button type="button"
                  onClick={() => setServices((p) => p.map((s) => ({ ...s, selected: false })))}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium px-3 py-1.5 bg-gray-100 rounded-lg">
                  × Deseleccionar todos
                </button>
              </div>

              <div className="space-y-2">
                {services.map((svc) => (
                  <div key={svc.id}
                    className={[
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
                      svc.selected
                        ? 'border-teal-200 bg-teal-50/50'
                        : 'border-gray-200 bg-gray-50/60 opacity-60',
                    ].join(' ')}
                    onClick={() => toggleService(svc.id)}>

                    {/* Checkbox visual */}
                    <div className={[
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                      svc.selected ? 'bg-teal-600 border-teal-600' : 'border-gray-300',
                    ].join(' ')}>
                      {svc.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>

                    {/* Color dot */}
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{svc.name}</p>
                      <p className="text-xs text-gray-400">{svc.duration_minutes} min</p>
                    </div>

                    {/* Precio editable */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-gray-500">S/</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={svc.price}
                        onChange={(e) => updatePrice(svc.id, e.target.value)}
                        className="w-16 text-right text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PASO 3: Éxito ══ */}
          {step === 3 && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-teal-600" />
              </div>
              <h3 className="font-sora font-bold text-slate-800 text-2xl mb-2">
                ¡Todo listo!
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Importamos <strong className="text-teal-700">{importedCount} servicio{importedCount !== 1 ? 's' : ''}</strong> a tu catálogo.
                Ya puedes recibir citas en línea.
              </p>

              <div className="space-y-3 max-w-sm mx-auto">
                {bookingUrl && (
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-sora font-semibold text-sm hover:bg-teal-700 transition-colors">
                    🔗 Ver mi página de reservas
                    <ChevronRight className="w-4 h-4" />
                  </a>
                )}

                <button type="button" onClick={handleClose}
                  className="w-full py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
                  Explorar el panel de administración
                </button>

                <p className="text-xs text-gray-400 mt-2">
                  Puedes ajustar precios y agregar más servicios en el módulo <strong>Servicios</strong>.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer con botones de navegación ── */}
        {step !== 3 && (
          <div className="p-5 border-t border-gray-100 flex items-center justify-between">
            <div>
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
                  <ChevronLeft className="w-4 h-4" />
                  Cambiar categoría
                </button>
              )}
              {step === 1 && (
                <button type="button" onClick={handleClose}
                  className="text-sm text-gray-400 hover:text-gray-600">
                  Omitir por ahora
                </button>
              )}
            </div>

            {step === 2 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {selectedCount} servicio{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                </span>
                <button type="button" onClick={handleImport}
                  disabled={importing || selectedCount === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-sora font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Importando...</>
                  ) : (
                    <>Importar servicios<ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
