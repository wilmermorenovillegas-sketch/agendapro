// ═══════════════════════════════════════════════════════════════
// src/pages/admin/PaymentsPage.jsx
// Bandeja de pagos pendientes de Yape/Plin para que el admin/profesional
// confirme o rechace los comprobantes subidos por clientes desde
// la pagina publica de reserva (/book/:tenantSlug).
//
// Solo lista citas con payment_status='uploaded'. Las pay_on_arrival
// no aparecen aca (no requieren revision online).
//
// Modelo: pagos como columnas en `appointments` (Modelo A, Phase 2.4).
// Bucket payment-proofs es PRIVADO → genera signed URL on-demand.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, Clock, DollarSign, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// ─── Helper: signed URL para comprobante en bucket privado ───
const getSignedReceiptUrl = async (path, expiresInSec = 600) => {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, expiresInSec);
  if (error) {
    console.warn('[PaymentsPage] signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl || null;
};

// ─── Sub-componente: imagen del comprobante con signed URL ───
function ReceiptThumbnail({ path, onOpen }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSignedReceiptUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (!path) return null;
  if (!url) {
    return (
      <div className="w-32 h-32 rounded-lg border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
        <Clock className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="Comprobante"
      className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200 cursor-pointer hover:border-teal-600 transition-colors"
      onClick={() => onOpen?.(url)}
    />
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);            // appointment_id en proceso de confirm/reject
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  // ─── Cargar citas con payment_status='uploaded' del tenant del usuario ─
  async function loadPayments() {
    setLoading(true);
    try {
      // tenant_id del usuario actual via app_metadata (lo setea el JWT)
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.app_metadata?.tenant_id;

      if (!tenantId) {
        // Fallback: leer de profiles
        const userId = session?.user?.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', userId)
          .single();
        if (!profile?.tenant_id) throw new Error('No se pudo determinar tu negocio.');
        await fetchByTenant(profile.tenant_id);
      } else {
        await fetchByTenant(tenantId);
      }
    } catch (err) {
      toast.error('Error al cargar pagos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchByTenant(tenantId) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, start_time, status, price, currency,
        payment_status, payment_proof_url, payment_method, rejection_reason, created_at,
        client:clients ( first_name, last_name, phone, email ),
        service:services ( name, duration_minutes ),
        professional:professionals ( first_name:profile_id, color, profiles:profile_id ( first_name, last_name ) ),
        location:locations ( name )
      `)
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'uploaded')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPayments(data || []);
  }

  // ─── Confirmar pago ─────────────────────────────────────────────
  async function handleConfirm(appointmentId) {
    setBusyId(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_status: 'approved',
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          payment_reviewed_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);
      if (error) throw error;
      toast.success('Pago confirmado');
      loadPayments();
    } catch (err) {
      toast.error('Error al confirmar: ' + err.message);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Rechazar pago ──────────────────────────────────────────────
  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Indica el motivo del rechazo.');
      return;
    }
    if (!selectedPayment) return;
    setBusyId(selectedPayment.id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_status: 'rejected',
          rejection_reason: rejectReason.trim(),
          payment_reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);
      if (error) throw error;
      toast.success('Pago rechazado. El cliente puede reintentar.');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedPayment(null);
      loadPayments();
    } catch (err) {
      toast.error('Error al rechazar: ' + err.message);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-sora">
          Pagos pendientes
        </h1>
        <p className="text-slate-600 mt-1 text-sm md:text-base">
          Revisa los comprobantes de Yape/Plin y aprueba o rechaza la cita.
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No hay pagos pendientes de revisión</p>
          <p className="text-slate-400 text-sm mt-1">
            Cuando un cliente suba un comprobante por la página pública, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((p) => {
            const clientName = p.client
              ? `${p.client.first_name || ''} ${p.client.last_name || ''}`.trim() || 'Sin nombre'
              : 'Sin cliente';
            const clientPhone = p.client?.phone || '—';
            const proName = p.professional?.profiles
              ? `${p.professional.profiles.first_name || ''} ${p.professional.profiles.last_name || ''}`.trim()
              : '—';
            const isYape = p.payment_method === 'yape_plin';

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl p-4 md:p-6 border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                  {p.payment_proof_url && (
                    <ReceiptThumbnail
                      path={p.payment_proof_url}
                      onOpen={(url) => window.open(url, '_blank')}
                    />
                  )}

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 font-sora">
                          {clientName}
                        </h3>
                        <p className="text-slate-600 text-sm">{clientPhone}</p>
                        <p className="text-teal-700 font-semibold mt-2">
                          {(p.currency || 'PEN') === 'PEN' ? 'S/ ' : ''}
                          {Number(p.price || 0).toFixed(2)}
                          {(p.currency || 'PEN') !== 'PEN' ? ` ${p.currency}` : ''}
                        </p>
                        {isYape && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                            <Wallet size={12} /> Yape / Plin
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          {new Date(p.start_time).toLocaleDateString('es-PE', {
                            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima',
                          })}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(p.start_time).toLocaleTimeString('es-PE', {
                            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Lima',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Servicio</p>
                        <p className="font-medium text-slate-900 truncate">
                          {p.service?.name || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Profesional</p>
                        <p className="font-medium text-slate-900 truncate">{proName}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Sede</p>
                        <p className="font-medium text-slate-900 truncate">
                          {p.location?.name || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirm(p.id)}
                        disabled={busyId === p.id}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium transition-colors"
                      >
                        <CheckCircle size={18} />
                        Confirmar pago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(p);
                          setRejectReason('');
                          setShowRejectModal(true);
                        }}
                        disabled={busyId === p.id}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                      >
                        <XCircle size={18} />
                        Rechazar
                      </button>
                      {p.payment_proof_url && (
                        <button
                          type="button"
                          onClick={async () => {
                            const url = await getSignedReceiptUrl(p.payment_proof_url);
                            if (url) window.open(url, '_blank');
                          }}
                          className="px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:border-teal-600 hover:text-teal-700 font-medium transition-colors"
                          title="Ver comprobante completo"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ MODAL DE RECHAZO ═══════ */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-3 font-sora">Rechazar pago</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Indica el motivo del rechazo para que el cliente pueda corregirlo:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: el comprobante no es legible, falta el código de operación, monto incorrecto..."
              className="w-full border-2 border-slate-300 rounded-lg p-3 focus:border-teal-600 focus:outline-none resize-none text-sm"
              rows={4}
            />
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedPayment(null);
                }}
                className="flex-1 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={busyId === selectedPayment?.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
