// ═══════════════════════════════════════════════════════════════
// src/pages/public/BookingPage.jsx
// Pagina publica de reserva de citas — /book/:tenantSlug
// No requiere autenticacion. Cualquiera con el link puede agendar.
//
// Flujo de 5 pasos:
//   1) StepLocation        → elige sede
//   2) StepProfessional    → elige profesional de esa sede
//   3) StepService         → elige servicio del profesional
//   4) StepPaymentMethod   → Yape/Plin (con comprobante) o Pagar al llegar
//   5) StepDateTime        → calendario + slots + formulario (+ comprobante condicional)
//
// Si todo es OK, muestra BookingSuccess.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';

import publicBookingService from '../../services/publicBookingService';
import StepLocation from '../../components/booking/StepLocation';
import StepProfessional from '../../components/booking/StepProfessional';
import StepService from '../../components/booking/StepService';
import StepPaymentMethod from '../../components/booking/StepPaymentMethod';
import StepDateTime from '../../components/booking/StepDateTime';
import BookingSuccess from '../../components/booking/BookingSuccess';

// ─── Constantes ──────────────────────────────────────────────────
const STEP_LABELS = ['Sede', 'Profesional', 'Servicio', 'Pago', 'Fecha y hora'];

// ─── Componente principal ───────────────────────────────────────
export default function BookingPage() {
  const { tenantSlug } = useParams();

  // ─── Estado de carga inicial ──────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [locationsTree, setLocationsTree] = useState([]);

  // ─── Estado del flujo ─────────────────────────────────────────
  // Paso actual 1..5
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  // Array de servicios (multi-selección)
  const [selectedServices, setSelectedServices] = useState([]);
  // 'yape_plin' | 'pay_on_arrival' | null
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // ─── Estado de submit ─────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // ─── Carga inicial: tenant + arbol de sedes ───────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const tenantInfo = await publicBookingService.getTenantBySlug(tenantSlug);
        if (cancelled) return;
        if (!tenantInfo) {
          setLoadError('not_found');
          return;
        }
        setTenant(tenantInfo);

        const tree = await publicBookingService.getLocationsTree(tenantInfo.id);
        if (cancelled) return;
        setLocationsTree(tree);
      } catch (err) {
        console.error('[BookingPage] error inicial', err);
        if (!cancelled) setLoadError('generic');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tenantSlug]);

  // ─── Listas derivadas segun seleccion ─────────────────────────
  const professionalsOfLocation = useMemo(() => {
    if (!selectedLocation) return [];
    const loc = locationsTree.find((l) => l.id === selectedLocation.id);
    return loc?.professionals || [];
  }, [selectedLocation, locationsTree]);

  const servicesOfProfessional = useMemo(() => {
    if (!selectedProfessional) return [];
    return selectedProfessional.services || [];
  }, [selectedProfessional]);

  // ─── Handlers de seleccion ────────────────────────────────────
  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    setSelectedProfessional(null);
    setSelectedServices([]);
    setCurrentStep(2);
  };

  const handleSelectProfessional = (pro) => {
    setSelectedProfessional(pro);
    setSelectedServices([]);
    setCurrentStep(3);
  };

  // Recibe array de servicios seleccionados
  const handleSelectServices = (srvArray) => {
    setSelectedServices(srvArray);
    setSelectedPaymentMethod(null);
    setCurrentStep(4);
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setCurrentStep(5);
  };

  const handleBack = () => {
    if (currentStep === 1) return;
    if (currentStep === 2) setSelectedLocation(null);
    if (currentStep === 3) setSelectedProfessional(null);
    if (currentStep === 4) setSelectedServices([]);
    if (currentStep === 5) setSelectedPaymentMethod(null);
    setCurrentStep(currentStep - 1);
  };

  // ─── Confirmar cita (paso 4 → BookingSuccess) ─────────────────
  const handleConfirmBooking = async (formData) => {
    if (!tenant || !selectedLocation || !selectedProfessional || !selectedServices.length) {
      toast.error('Faltan datos. Vuelve a empezar.');
      return;
    }

    setIsSubmitting(true);
    const tId = toast.loading('Reservando tu cita...');

    try {
      const result = await publicBookingService.createAppointment({
        tenant_id: tenant.id,
        location_id: selectedLocation.id,
        professional_id: selectedProfessional.id,
        // Primer servicio como principal (backward compat), array completo para multi
        service_id: selectedServices[0].id,
        service_ids: selectedServices.map((s) => s.id),
        client_first_name: formData.client_first_name,
        client_last_name: formData.client_last_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email,
        start_time: formData.start_time,
        payment_method: formData.payment_method || selectedPaymentMethod,
        payment_proof_url: formData.payment_proof_url,
      });

      toast.success('¡Cita solicitada!', { id: tId });
      setCreatedAppointment({
        id: result.appointment_id,
        start_time: result.start_time,
      });
    } catch (err) {
      console.error('[BookingPage] confirm', err);
      toast.error(err.message || 'No se pudo reservar la cita.', { id: tId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Reset para "Agendar otra cita" ───────────────────────────
  const handleBookAnother = () => {
    setSelectedLocation(null);
    setSelectedProfessional(null);
    setSelectedServices([]);
    setSelectedPaymentMethod(null);
    setCreatedAppointment(null);
    setCurrentStep(1);
  };

  // ═══════════════ RENDER: Estados de carga / error ═══════════
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F6F8' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm text-gray-500 font-sora">Cargando...</p>
        </div>
      </div>
    );
  }

  if (loadError === 'not_found' || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F4F6F8' }}>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-sora font-bold text-slate-800 mb-2">
            Negocio no encontrado
          </h1>
          <p className="text-sm text-gray-500">
            Este negocio no está disponible en AgendaPro o el enlace es incorrecto.
          </p>
        </div>
      </div>
    );
  }

  if (loadError === 'generic') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F4F6F8' }}>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-sora font-bold text-slate-800 mb-2">
            Algo salió mal
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            No pudimos cargar la información. Intenta refrescar la página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════ RENDER: Layout principal ═══════════════════
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F8' }}>
      <Toaster position="top-right" />

      {/* ═══════ HEADER con logo + nombre ═══════ */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.business_name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold font-sora"
              style={{ backgroundColor: tenant.primary_color || '#0F766E' }}
            >
              {(tenant.business_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-sora font-bold text-slate-800 truncate">
              {tenant.business_name}
            </h1>
            <p className="text-xs text-gray-500 truncate">Reservar cita en línea</p>
          </div>
        </div>
      </header>

      {/* ═══════ SI HAY EXITO: pantalla final ═══════ */}
      {createdAppointment ? (
        <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          <BookingSuccess
            appointmentId={createdAppointment.id}
            startTime={createdAppointment.start_time}
            serviceName={selectedServices.map((s) => s.name).join(', ')}
            professionalName={
              selectedProfessional
                ? `${selectedProfessional.first_name || ''} ${selectedProfessional.last_name || ''}`.trim()
                : ''
            }
            locationName={selectedLocation?.name}
            onBookAnother={handleBookAnother}
          />
        </main>
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          {/* ═══ Breadcrumb / progreso ═══ */}
          <nav className="mb-5 overflow-x-auto">
            <ol className="flex gap-2 min-w-max">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isDone = stepNum < currentStep;
                return (
                  <li key={label} className="flex items-center gap-2">
                    <span
                      className={[
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sora font-medium',
                        isActive && 'bg-teal-600 text-white',
                        isDone && 'bg-teal-50 text-teal-700',
                        !isActive && !isDone && 'bg-white border border-gray-200 text-gray-400',
                      ].filter(Boolean).join(' ')}
                    >
                      <span
                        className={[
                          'w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold',
                          isActive && 'bg-white text-teal-700',
                          isDone && 'bg-teal-600 text-white',
                          !isActive && !isDone && 'bg-gray-100 text-gray-400',
                        ].filter(Boolean).join(' ')}
                      >
                        {stepNum}
                      </span>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ═══ Boton "Atras" (no en paso 1) ═══ */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-700 font-medium mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
          )}

          {/* ═══ Renderizado condicional del paso ═══ */}
          {currentStep === 1 && (
            <StepLocation
              locations={locationsTree}
              onSelectLocation={handleSelectLocation}
            />
          )}

          {currentStep === 2 && (
            <StepProfessional
              professionals={professionalsOfLocation}
              onSelectProfessional={handleSelectProfessional}
            />
          )}

          {currentStep === 3 && (
            <StepService
              services={servicesOfProfessional}
              onSelectServices={handleSelectServices}
            />
          )}

          {currentStep === 4 && selectedServices.length > 0 && (
            <StepPaymentMethod
              amount={selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)}
              selectedMethod={selectedPaymentMethod}
              onSelect={handleSelectPaymentMethod}
            />
          )}

          {currentStep === 5 && selectedServices.length > 0 && selectedPaymentMethod && (
            <StepDateTime
              tenantId={tenant.id}
              locationId={selectedLocation.id}
              professionalId={selectedProfessional.id}
              services={selectedServices}
              paymentMethod={selectedPaymentMethod}
              maxAdvanceDays={tenant.max_advance_booking_days || 30}
              onConfirm={handleConfirmBooking}
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      )}

      {/* Footer minimo */}
      <footer className="text-center text-xs text-gray-400 py-6">
        Powered by{' '}
        <span className="font-sora font-semibold text-teal-700">AgendaPro</span>
      </footer>
    </div>
  );
}
