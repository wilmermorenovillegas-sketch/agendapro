// services/auditService.js
// Servicio para consulta de logs de auditoría

import { supabase } from '../config/supabaseClient';

/**
 * Obtiene logs de auditoría con filtros
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const { 
      tableName = null, 
      userId = null, 
      startDate = null, 
      endDate = null, 
      limit = 100 
    } = filters;

    const { data, error } = await supabase.rpc('admin_get_audit_logs', {
      p_table_name: tableName,
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener logs');
    }

    return result.logs || [];
  } catch (error) {
    console.error('Error en getAuditLogs:', error);
    throw error;
  }
};
