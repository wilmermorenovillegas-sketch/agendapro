// ═══════════════════════════════════════════════════════════════
// src/services/notificationService.js
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const notificationService = {
  getAll: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  sendReminders: async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    return result;
  },
};

export default notificationService;
