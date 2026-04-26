// services/softDeleteService.js
// Servicio para soft delete y papelera

import { supabase } from '../config/supabaseClient';

/**
 * Soft delete de un registro
 */
export const softDeleteRecord = async (tableName, recordId, reason = null) => {
  try {
    const { data, error } = await supabase.rpc('soft_delete_record', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_reason: reason
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar registro');
    }

    return result;
  } catch (error) {
    console.error('Error en softDeleteRecord:', error);
    throw error;
  }
};

/**
 * Restaurar un registro soft-deleted
 */
export const restoreDeletedRecord = async (tableName, recordId) => {
  try {
    const { data, error } = await supabase.rpc('restore_deleted_record', {
      p_table_name: tableName,
      p_record_id: recordId
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al restaurar registro');
    }

    return result;
  } catch (error) {
    console.error('Error en restoreDeletedRecord:', error);
    throw error;
  }
};

/**
 * Obtiene registros eliminados (papelera)
 */
export const getDeletedRecords = async (tableName, daysAgo = 30) => {
  try {
    const { data, error } = await supabase.rpc('admin_get_deleted_records', {
      p_table_name: tableName,
      p_days_ago: daysAgo
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener registros eliminados');
    }

    return result.deleted_records || [];
  } catch (error) {
    console.error('Error en getDeletedRecords:', error);
    throw error;
  }
};
