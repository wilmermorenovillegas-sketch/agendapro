// ═══════════════════════════════════════════════════════════════
// src/services/performanceService.js
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const performanceService = {
  getAll: async (period = 'month') => {
    const { data, error } = await supabase.rpc('get_professional_performance', { p_period: period });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },
};

export default performanceService;
