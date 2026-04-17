// ═══════════════════════════════════════════════════════════════
// src/services/appointmentService.js
// Con campos de pago incluidos
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const appointmentService = {
  getAll: async (filters = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    let query = supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status, price, notes,
        payment_status, payment_proof_url, payment_notes,
        client_id, service_id, professional_id, location_id,
        clients ( first_name, last_name, phone, email ),
        services ( name, duration_minutes, color ),
        professionals ( color, profile_id ),
        locations ( name )
      `)
      .eq('tenant_id', tenantId);

    if (filters.startDate) query = query.gte('start_time', filters.startDate);
    if (filters.endDate) query = query.lte('start_time', filters.endDate);
    if (filters.professionalId) query = query.eq('professional_id', filters.professionalId);
    if (filters.locationId) query = query.eq('location_id', filters.locationId);
    if (filters.status) query = query.eq('status', filters.status);

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  create: async (appointment) => {
    const { data, error } = await supabase.rpc('create_appointment', {
      p_location_id: appointment.location_id,
      p_professional_id: appointment.professional_id,
      p_service_id: appointment.service_id,
      p_client_id: appointment.client_id,
      p_start_time: appointment.start_time,
      p_duration_minutes: appointment.duration_minutes,
      p_price: appointment.price || null,
      p_notes: appointment.notes || '',
    });

    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result && !result.success) throw new Error(result.message);
    return result;
  },

  updateStatus: async (id, status, reason = '') => {
    const updates = { status };
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = reason;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  checkAvailability: async (professionalId, startTime, endTime) => {
    const { data, error } = await supabase.rpc('check_appointment_availability', {
      p_professional_id: professionalId,
      p_start_time: startTime,
      p_end_time: endTime,
    });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },
};

export default appointmentService;
