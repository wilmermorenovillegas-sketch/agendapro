// ═══════════════════════════════════════════════════════════════
// src/services/publicBookingService.js
// Servicio para la pagina publica de reserva (/book/:tenantSlug).
// Llama a las RPCs públicas (SECURITY DEFINER) sin requerir auth.
//
// RPCs activas:
//   get_public_tenant_by_slug     → info del tenant
//   get_public_locations_and_pros → árbol de sedes/profesionales/servicios
//   get_available_slots           → slots disponibles (multi-servicio)
//   create_public_appointment     → crea la cita + appointment_services
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
  // - date: string 'YYYY-MM-DD' (zona Lima)
  // - totalDuration: duración total en minutos (opcional, para multi-servicio)
  async getAvailableSlots({ professionalId, serviceId, locationId, date, totalDuration }) {
    const params = {
      p_professional_id: professionalId,
      p_service_id:      serviceId,
      p_location_id:     locationId,
      p_date:            date,
    };
    // Solo pasar totalDuration si viene definido (evita ambigüedad con la versión de 4 params)
    if (totalDuration != null && totalDuration > 0) {
      params.p_total_duration = totalDuration;
    }
    const { data, error } = await supabase.rpc('get_available_slots', params);
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

  // Crea la cita publica via RPC usando parámetros individuales.
  // Soporta multi-servicio via service_ids[] (campo nuevo).
  // payload: {
  //   tenant_id, location_id, professional_id,
  //   service_id (primer servicio), service_ids (array completo),
  //   client_first_name, client_last_name, client_phone, client_email,
  //   start_time (ISO), payment_method, payment_proof_url
  // }
  async createAppointment(payload) {
    const { data, error } = await supabase.rpc('create_public_appointment', {
      p_tenant_id:         payload.tenant_id,
      p_location_id:       payload.location_id,
      p_professional_id:   payload.professional_id,
      p_service_id:        payload.service_id,
      p_client_first_name: payload.client_first_name,
      p_client_last_name:  payload.client_last_name  || '',
      p_client_phone:      payload.client_phone,
      p_client_email:      payload.client_email       || '',
      p_start_time:        payload.start_time,
      p_payment_method:    payload.payment_method     || 'pay_on_arrival',
      p_payment_proof_url: payload.payment_proof_url  || null,
      p_service_ids:       payload.service_ids        || null,
    });
    if (error) throw error;
    const result = parseRpc(data);
    if (result && result.success === false) {
      throw new Error(result.message || 'No se pudo crear la cita.');
    }
    return result;
  },
};

export default publicBookingService;
