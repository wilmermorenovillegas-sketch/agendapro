// ═══════════════════════════════════════════════════════════════
// src/services/clientService.js
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const clientService = {
  getAll: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  create: async (client) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;
    const userId = session?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...client,
        tenant_id: tenantId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  remove: async (id) => {
    const { error } = await supabase
      .from('clients')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  search: async (query) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,document_number.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },
};

export default clientService;
