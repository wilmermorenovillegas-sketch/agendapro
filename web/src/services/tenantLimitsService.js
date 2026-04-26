// services/tenantLimitsService.js
// Servicio para gestión de límites por tenant

import { supabase } from '../config/supabaseClient';

/**
 * Verifica si se puede crear más recursos (usuarios, citas)
 */
export const checkTenantLimit = async (tenantId, limitType) => {
  try {
    const { data, error } = await supabase.rpc('check_tenant_limit', {
      p_tenant_id: tenantId,
      p_limit_type: limitType
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return result;
  } catch (error) {
    console.error('Error en checkTenantLimit:', error);
    throw error;
  }
};

/**
 * Admin obtiene límites y uso de su tenant
 */
export const getTenantLimits = async () => {
  try {
    const { data, error } = await supabase.rpc('admin_get_tenant_limits');

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener límites');
    }

    return {
      limits: result.limits,
      usage: result.usage
    };
  } catch (error) {
    console.error('Error en getTenantLimits:', error);
    throw error;
  }
};

/**
 * SuperAdmin actualiza límites de un tenant
 */
export const updateTenantLimits = async (tenantId, limits) => {
  try {
    const { data, error } = await supabase.rpc('superadmin_update_tenant_limits', {
      p_tenant_id: tenantId,
      p_max_users: limits.maxUsers || null,
      p_max_appointments: limits.maxAppointments || null,
      p_max_storage_mb: limits.maxStorageMb || null
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al actualizar límites');
    }

    return result;
  } catch (error) {
    console.error('Error en updateTenantLimits:', error);
    throw error;
  }
};
