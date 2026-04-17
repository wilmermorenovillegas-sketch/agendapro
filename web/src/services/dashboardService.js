// ═══════════════════════════════════════════════════════════════
// src/services/dashboardService.js
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const dashboardService = {
  getStats: async (period = 'month') => {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_period: period });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },
};

export default dashboardService;
