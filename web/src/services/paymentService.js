// ═══════════════════════════════════════════════════════════════
// src/services/paymentService.js
// Subida de comprobantes y gestión de estados de pago
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const paymentService = {
  // Subir comprobante de pago (imagen o PDF)
  uploadProof: async (appointmentId, file) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    // Nombre único: tenant_id/appointment_id/timestamp.ext
    const ext = file.name.split('.').pop();
    const fileName = `${tenantId}/${appointmentId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // Obtener URL pública (signed URL por 1 año)
    const { data: urlData } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(fileName, 31536000); // 1 año

    const proofUrl = urlData?.signedUrl || '';

    // Actualizar cita con la URL del comprobante
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        payment_status: 'uploaded',
        payment_proof_url: proofUrl,
      })
      .eq('id', appointmentId);

    if (updateError) throw updateError;
    return proofUrl;
  },

  // Admin aprueba el pago
  approve: async (appointmentId, notes = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'approved',
        payment_reviewed_at: new Date().toISOString(),
        payment_reviewed_by: session?.user?.id,
        payment_notes: notes,
      })
      .eq('id', appointmentId);
    if (error) throw error;
  },

  // Admin rechaza el pago
  reject: async (appointmentId, notes = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'rejected',
        payment_reviewed_at: new Date().toISOString(),
        payment_reviewed_by: session?.user?.id,
        payment_notes: notes,
      })
      .eq('id', appointmentId);
    if (error) throw error;
  },
};

export default paymentService;
