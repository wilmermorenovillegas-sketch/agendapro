// ═══════════════════════════════════════════════════════════════
// src/services/professionalService.js
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const professionalService = {
  getAll: async () => {
    const { data, error } = await supabase.rpc('get_tenant_professionals');
    if (error) throw error;
    return data || [];
  },

  create: async ({ email, password, firstName, lastName, phone, title, specialty, bio, color, locationIds }) => {
    const { data, error } = await supabase.rpc('create_professional', {
      p_email: email,
      p_password: password,
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: phone || '',
      p_title: title || '',
      p_specialty: specialty || '',
      p_bio: bio || '',
      p_color: color || '#0F766E',
      p_location_ids: locationIds || [],
    });

    if (error) throw error;

    // La respuesta RPC puede venir como string o como objeto
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result && !result.success) throw new Error(result.message);
    return result;
  },

  update: async (id, updates) => {
    const { error } = await supabase
      .from('professionals')
      .update({
        title: updates.title,
        specialty: updates.specialty,
        bio: updates.bio,
        color: updates.color,
        is_active: updates.is_active,
        accepts_online: updates.accepts_online,
        max_daily_appointments: updates.max_daily_appointments,
        default_appointment_duration: updates.default_appointment_duration,
      })
      .eq('id', id);

    if (error) throw error;

    if (updates.profile_id) {
      await supabase
        .from('profiles')
        .update({
          first_name: updates.first_name,
          last_name: updates.last_name,
          phone_number: updates.phone_number,
        })
        .eq('id', updates.profile_id);
    }

    if (updates.location_ids !== undefined) {
      await supabase.from('professional_locations').delete().eq('professional_id', id);
      if (updates.location_ids.length > 0) {
        await supabase.from('professional_locations').insert(
          updates.location_ids.map(locId => ({ professional_id: id, location_id: locId }))
        );
      }
    }
  },

  remove: async (id) => {
    const { error } = await supabase
      .from('professionals')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // ─── Horarios semanales del profesional ─────────────────────────
  // Retorna array de filas de professional_schedules (location_id = null = horario general)
  getSchedule: async (professionalId) => {
    const { data, error } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .is('location_id', null)
      .order('day_of_week');
    if (error) throw error;
    return data || [];
  },

  // Reemplaza todos los horarios generales del profesional de una vez
  saveSchedule: async (professionalId, schedules) => {
    // 1. Borrar los existentes (horario general, sin sede específica)
    const { error: delError } = await supabase
      .from('professional_schedules')
      .delete()
      .eq('professional_id', professionalId)
      .is('location_id', null);
    if (delError) throw delError;

    // 2. Insertar los activos
    const toInsert = schedules
      .filter((s) => s.is_active)
      .map((s) => ({
        professional_id: professionalId,
        location_id: null,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: true,
      }));

    if (toInsert.length > 0) {
      const { error: insError } = await supabase
        .from('professional_schedules')
        .insert(toInsert);
      if (insError) throw insError;
    }
  },
};

export default professionalService;
