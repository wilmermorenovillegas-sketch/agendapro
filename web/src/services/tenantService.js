// ═══════════════════════════════════════════════════════════════
// src/services/tenantService.js
// Operaciones del tenant contra Supabase
// Usa función RPC (SECURITY DEFINER) para acceder a datos del tenant
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const tenantService = {
  // Obtener datos completos del tenant del usuario actual
  getMyTenant: async () => {
    const { data, error } = await supabase.rpc('get_my_tenant_details');

    if (error) throw error;
    return data;
  },

  // Actualizar datos del tenant
  updateTenant: async (tenantId, updates) => {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Subir logo a Supabase Storage
  uploadLogo: async (tenantId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('tenant-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('tenant-assets')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ logo_url: urlData.publicUrl })
      .eq('id', tenantId);

    if (updateError) throw updateError;

    return urlData.publicUrl;
  },

  // Obtener categorías de negocio
  getCategories: async () => {
    const { data, error } = await supabase
      .from('business_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },
};

export default tenantService;
