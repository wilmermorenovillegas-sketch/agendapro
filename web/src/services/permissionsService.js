// ============================================================
// permissionsService.js - NEXOVA AgendaPro
// Servicio para gestión de permisos (Admin only)
// ============================================================

import { supabase } from '../lib/supabase';

const parseResult = (data) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
};

export const listAllPermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('is_active', true)
      .order('module', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[permissionsService] listAllPermissions error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, permissions: data || [] };
  } catch (err) {
    console.error('[permissionsService] listAllPermissions exception:', err);
    return { success: false, error: err.message };
  }
};

export const listUsersWithPermissions = async () => {
  try {
    const { data, error } = await supabase.rpc('admin_list_users_with_permissions');

    if (error) {
      console.error('[permissionsService] listUsersWithPermissions error:', error);
      return { success: false, error: error.message };
    }

    const result = parseResult(data);
    return result || { success: false, error: 'Respuesta inválida' };
  } catch (err) {
    console.error('[permissionsService] listUsersWithPermissions exception:', err);
    return { success: false, error: err.message };
  }
};

export const assignPermissions = async (userId, permissionCodes) => {
  try {
    const { data, error } = await supabase.rpc('admin_assign_permissions', {
      p_user_id: userId,
      p_permission_codes: permissionCodes,
    });

    if (error) {
      console.error('[permissionsService] assignPermissions error:', error);
      return { success: false, error: error.message };
    }

    const result = parseResult(data);
    return result || { success: true, message: 'Permisos asignados' };
  } catch (err) {
    console.error('[permissionsService] assignPermissions exception:', err);
    return { success: false, error: err.message };
  }
};

export const getUserPermissions = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[permissionsService] getUserPermissions error:', error);
      return { success: false, error: error.message };
    }

    const result = parseResult(data);
    return result || { success: false, error: 'Respuesta inválida' };
  } catch (err) {
    console.error('[permissionsService] getUserPermissions exception:', err);
    return { success: false, error: err.message };
  }
};
