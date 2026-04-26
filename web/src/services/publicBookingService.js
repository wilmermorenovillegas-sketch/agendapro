// ═══════════════════════════════════════════════════════════════
// src/services/publicBookingService.js
// Servicio para la pagina publica de reserva (/book/:tenantSlug).
// Llama a las 4 RPCs publicas (SECURITY DEFINER) creadas en la
// migracion 003_public_booking. Funciona con el ANON KEY de Supabase
// sin requerir usuario autenticado.
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

// Helper defensivo: las RPCs pueden devolver JSON como string
const parseRpc = (data) => (typeof data === 'string' ? JSON.parse(data) : data);

const publicBookingService = {
  // Obtiene info publica del tenant por slug.
  // Devuelve null si el slug no existe o el tenant esta inactivo.
  async getTenantBySlug(slug) {
    if (!slug) return null;
    const { data, error } = await supabase.rpc('get_public_tenant_by_slug', {
      p_slug: slug,
    });
    if (error) throw error;
    return parseRpc(data); // null o { id, business_name, logo_url, ... }
  },

  // Devuelve el arbol completo de un tenant:
  // [{ id, name, address, ..., professionals: [{ id, ..., services: [...] }] }]
  async getLocationsTree(tenantId) {
    const { data, error } = await supabase.rpc('get_public_locations_and_pros', {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    const parsed = parseRpc(data);
    return Array.isArray(parsed) ? parsed : [];
  },

  // Slots disponibles para un profesional+servicio en una fecha.
  // date debe venir como string 'YYYY-MM-DD' (zona Lima).
  async getAvailableSlots({ professionalId, serviceId, locationId, date }) {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_professional_id: professionalId,
      p_service_id: serviceId,
      p_location_id: locationId,
      p_date: date,
    });
    if (error) throw error;
    const parsed = parseRpc(data);
    return Array.isArray(parsed) ? parsed : [];
  },

  // Sube el comprobante de Yape/Plin al bucket privado payment-proofs.
  // Path: {tenant_id}/public-bookings/{timestamp}_{random}.{ext}
  // Devuelve el path (no signed URL) — el admin genera signed URL al revisar.
  async uploadPaymentProof({ tenantId, file }) {
    if (!file) throw new Error('No hay archivo para subir');
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo no debe pesar más de 5 MB');
    }

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ext = /^(jpg|jpeg|png|webp|heic|heif)$/.test(rawExt) ? rawExt : 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    const path = `${tenantId}/public-bookings/${timestamp}_${random}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(path, file, {
        contentType: file.type || `image/${ext}`,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    return path;
  },

  // Crea la cita publica via RPC. Hace upsert del cliente por telefono.
  // payload: { tenant_id, location_id, professional_id, service_id,
  //            client_first_name, client_last_name, client_phone,
  //            client_email, start_time (ISO), payment_proof_url }
  async createAppointment(payload) {
    const { data, error } = await supabase.rpc('create_public_appointment', {
      p_data: payload,
    });
    if (error) throw error;
    const result = parseRpc(data);
    if (result && !result.success) {
      throw new Error(result.message || 'No se pudo crear la cita.');
    }
    return result;
  },
};

export default publicBookingService;
