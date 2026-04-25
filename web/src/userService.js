// ============================================================
// userService.js - NEXOVA AgendaPro
// Servicio para gestionar usuarios (Admin only)
// ============================================================

import { supabase } from '../lib/supabase';

const parseRpcResult = (data) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
};

export const listUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      console.error('[userService] listUsers error:', error);
      return { success: false, error: error.message };
    }
    const users = parseRpcResult(data) || [];
    return { success: true, users };
  } catch (err) {
    console.error('[userService] listUsers excepcion:', err);
    return { success: false, error: err.message };
  }
};

export const resetPassword = async (userId, newPassword) => {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La contrasena debe tener al menos 6 caracteres' };
    }

    const { data, error } = await supabase.rpc('admin_reset_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    });

    if (error) {
      console.error('[userService] resetPassword error:', error);
      return { success: false, error: error.message };
    }

    const result = parseRpcResult(data);
    return result || { success: true, message: 'Contrasena actualizada' };
  } catch (err) {
    console.error('[userService] resetPassword excepcion:', err);
    return { success: false, error: err.message };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const { data, error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_first_name: updates.first_name ?? null,
      p_last_name: updates.last_name ?? null,
      p_phone_number: updates.phone_number ?? null,
      p_role_name: updates.role_name ?? null,
      p_is_active: updates.is_active ?? null,
    });

    if (error) {
      console.error('[userService] updateUser error:', error);
      return { success: false, error: error.message };
    }

    const result = parseRpcResult(data);
    return result || { success: true, message: 'Usuario actualizado' };
  } catch (err) {
    console.error('[userService] updateUser excepcion:', err);
    return { success: false, error: err.message };
  }
};

export const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + '!';
};
