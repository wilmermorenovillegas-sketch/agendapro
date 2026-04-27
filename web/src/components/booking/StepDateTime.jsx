// ═══════════════════════════════════════════════════════════════
// src/components/booking/StepDateTime.jsx
// Paso 4 — calendario + slots + formulario + comprobante.
//
// Calendario simple con CSS Grid (sin librerias externas).
// - Se respeta max_advance_booking_days (no permitir reservar mas alla).
// - Al elegir un dia, se cargan slots via getAvailableSlots.
// - Slots se muestran como botones; click → selectedSlot.
// - Formulario abajo con: nombre, telefono, email opcional + comprobante.
// - Boton "Confirmar Cita" disabled hasta que todo este listo.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import publicBookingService from '../../services/publicBookingService';
import PaymentUpload from './PaymentUpload';

// ─── Helpers de fecha ────────────────────────────────────────────
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

// Local date constructor (evita el bug UTC midnight)
const makeDate = (y, m, d) => new Date(y, m, d, 0, 0, 0, 0);

// 'YYYY-MM-DD' en hora local
const toLocalISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// "9:00 AM" formateado en zona Lima desde un ISO con timezone
const formatSlotLabel = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Lima',
  });
};

// Mismo dia local? (sin tocar hora)
const isSameLocalDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function StepDateTime({
  tenantId,
  locationId,
  professionalId,
  // Acepta array (multi-servicio) o servicio único (backward compat)
  services,
  service,
  maxAdvanceDays = 30,
  onConfirm,
  isSubmitting = false,
  // 'yape_plin' | 'pay_on_arrival' — define si pedimos comprobante o no
  paymentMethod = 'yape_plin',
}) {
  // Normalizar: siempre trabajamos con array internamente
  const servicesArray = services
    ? (Array.isArray(services) ? services : [services])
    : (service ? [service] : []);

  // Duración total y precio total de todos los servicios seleccionados
  const totalDuration = servicesArray.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
  const totalPrice    = servicesArray.reduce((sum, s) => sum + Number(s.price || 0), 0);
  // Primer servicio (para la llamada RPC de backward compat)
  const primaryService = servicesArray[0] || {};

  const requiresReceipt = paymentMethod === 'yape_plin';
  // ─── Estado del calendario ──────────────────────────────────
  const today = useMemo(() => makeDate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  ), []);

  // El cursor controla que mes se ve (siempre dia 1 del mes mostrado)
  const [cursor, setCursor] = useState(makeDate(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);

  // ─── Estado de slots ────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ─── Estado del formulario ──────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentProofPath, setPaymentProofPath] = useState(null);

  // Limite de la reserva en el futuro
  const maxBookingDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxAdvanceDays);
    return d;
  }, [today, maxAdvanceDays]);

  // ─── Cargar slots cuando cambia la fecha seleccionada ───────
  useEffect(() => {
    if (!selectedDate) { setSlots([]); setSelectedSlot(null); return; }

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);

    publicBookingService
      .getAvailableSlots({
        professionalId,
        serviceId: primaryService.id,
        locationId,
        date: toLocalISODate(selectedDate),
        totalDuration,  // pasa la duración total para slots multi-servicio
      })
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch((err) => {
        console.error('[StepDateTime] getAvailableSlots', err);
        if (!cancelled) setSlots([]);
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });

    return () => { cancelled = true; };
  }, [selectedDate, professionalId, primaryService.id, locationId, totalDuration]);

  // ─── Construir las celdas del mes ───────────────────────────
  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = makeDate(year, month, 1);
    // En JS getDay: 0=domingo. Yo quiero L=0..D=6
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null); // padding
    for (let d = 1; d <= daysInMonth; d++) cells.push(makeDate(year, month, d));
    return cells;
  }, [cursor]);

  // ─── Navegacion entre meses ─────────────────────────────────
  const canGoPrev = useMemo(() => {
    // No permitir ir a meses anteriores al actual
    return cursor > makeDate(today.getFullYear(), today.getMonth(), 1);
  }, [cursor, today]);

  const canGoNext = useMemo(() => {
    // Permitir ir mientras quede algun dia disponible dentro del limite
    const lastOfCursor = makeDate(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return lastOfCursor < maxBookingDate;
  }, [cursor, maxBookingDate]);

  const goPrev = () => canGoPrev && setCursor(
    makeDate(cursor.getFullYear(), cursor.getMonth() - 1, 1),
  );
  const goNext = () => canGoNext && setCursor(
    makeDate(cursor.getFullYear(), cursor.getMonth() + 1, 1),
  );

  // ─── ¿Una celda es seleccionable? ───────────────────────────
  const isSelectableDay = (date) => {
    if (!date) return false;
    if (date < today) return false;
    if (date > maxBookingDate) return false;
    return true;
  };

  // ─── Validacion final del formulario ────────────────────────
  // Solo se exige comprobante si el metodo es Yape/Plin.
  const canSubmit =
    !!selectedSlot &&
    firstName.trim().length > 0 &&
    phone.trim().length >= 6 &&
    (requiresReceipt ? !!paymentProofPath : true) &&
    !isSubmitting;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      client_first_name: firstName.trim(),
      client_last_name: lastName.trim(),
      client_phone: phone.trim(),
      client_email: email.trim(),
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      payment_method: paymentMethod,
      payment_proof_url: requiresReceipt ? paymentProofPath : null,
    });
  };

  // Formato amigable de precio total
  const totalPriceFormatted = `S/ ${totalPrice.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-sora font-bold text-slate-800">
          Elige fecha y hora
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona un día disponible y luego un horario.
        </p>
      </div>

      {/* Resumen de servicios seleccionados */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-teal-600 font-medium mb-0.5">Servicios seleccionados</p>
          <p className="text-sm font-semibold text-teal-900 truncate">
            {servicesArray.map((s) => s.name).join(' + ')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-teal-600">{totalDuration} min</p>
          <p className="text-sm font-bold text-teal-800">S/ {totalPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════ CALENDARIO ═══════ */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="font-sora font-semibold text-slate-800 capitalize">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const selectable = isSelectableDay(date);
              const isSelected = selectedDate && isSameLocalDay(date, selectedDate);
              const isToday = isSameLocalDay(date, today);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!selectable}
                  onClick={() => setSelectedDate(date)}
                  className={[
                    'aspect-square rounded-lg text-sm font-medium transition-colors',
                    !selectable && 'text-gray-300 cursor-not-allowed',
                    selectable && !isSelected && 'text-slate-700 hover:bg-teal-50 hover:text-teal-700',
                    isSelected && 'bg-teal-600 text-white shadow-sm',
                    isToday && !isSelected && 'ring-1 ring-teal-300',
                  ].filter(Boolean).join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ SLOTS ═══════ */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-sora font-semibold text-slate-800 mb-3">
            {selectedDate
              ? `Horarios disponibles — ${selectedDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}`
              : 'Horarios disponibles'}
          </h3>

          {!selectedDate && (
            <p className="text-sm text-gray-400 py-8 text-center">
              Selecciona un día en el calendario.
            </p>
          )}

          {selectedDate && loadingSlots && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          )}

          {selectedDate && !loadingSlots && slots.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">
              No hay horarios disponibles este día. Prueba con otra fecha.
            </p>
          )}

          {selectedDate && !loadingSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.start_time === slot.start_time;
                return (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={[
                      'px-2 py-2 rounded-lg text-sm font-medium border transition-colors',
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-700 border-gray-200 hover:border-teal-500 hover:text-teal-700',
                    ].join(' ')}
                  >
                    {formatSlotLabel(slot.start_time)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ FORMULARIO + COMPROBANTE ═══════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 space-y-5">
        <h3 className="font-sora font-semibold text-slate-800">
          Tus datos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-sora">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej. Juan"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-sora">
              Apellido
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Pérez"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              autoComplete="family-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-sora">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51 9XX XXX XXX"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 font-sora">
              Email <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              autoComplete="email"
            />
          </div>
        </div>

        {requiresReceipt ? (
          <PaymentUpload
            tenantId={tenantId}
            onUploaded={(path) => setPaymentProofPath(path)}
          />
        ) : (
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <p className="text-sm font-sora font-medium text-teal-800">
              Pagarás al llegar al local
            </p>
            <p className="text-xs text-teal-700/80 mt-1">
              No necesitas adjuntar comprobante. Lleva efectivo o tarjeta el día de tu cita.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl font-sora font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirmar Cita
            </>
          )}
        </button>

        {!selectedSlot && (
          <p className="text-xs text-gray-400 text-center">
            Selecciona un horario para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
