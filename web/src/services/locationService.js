// ═══════════════════════════════════════════════════════════════
// src/services/locationService.js
// CRUD de sedes/locales contra Supabase
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const locationService = {
  // Obtener todas las sedes del tenant actual
  getAll: async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_deleted', false)
      .order('is_main', { ascending: false })
      .order('name');

    if (error) throw error;
    return data;
  },

  // Obtener una sede por ID
  getById: async (id) => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear nueva sede
  create: async (location) => {
    // Obtener tenant_id y user_id desde la sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;
    const userId = session?.user?.id;

    if (!tenantId) {
      throw new Error('No se pudo obtener el ID del negocio. Cierre sesión e ingrese nuevamente.');
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        ...location,
        tenant_id: tenantId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar sede
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Soft delete
  remove: async (id) => {
    const { error } = await supabase
      .from('locations')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Marcar como sede principal
  setAsMain: async (id, tenantId) => {
    if (!tenantId) {
      const { data: { session } } = await supabase.auth.getSession();
      tenantId = session?.user?.app_metadata?.tenant_id;
    }

    // Quitar is_main de todas las sedes del tenant
    await supabase
      .from('locations')
      .update({ is_main: false })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false);

    // Marcar esta como principal
    const { data, error } = await supabase
      .from('locations')
      .update({ is_main: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Subir foto de sede
  uploadPhoto: async (tenantId, locationId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/locations/${locationId}/photo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('tenant-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('tenant-assets')
      .getPublicUrl(fileName);

    // Guardar URL en la sede
    await supabase
      .from('locations')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', locationId);

    return urlData.publicUrl;
  },
};

export default locationService;
