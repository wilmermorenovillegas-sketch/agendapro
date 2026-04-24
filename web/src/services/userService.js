// ============================================================
// userService.js - NEXOVA AgendaPro
// Servicio para gestionar usuarios (Admin only)
// Llama a funciones RPC de Supabase con SECURITY DEFINER
// ============================================================

import { supabase } from '../lib/supabase';

/**
 * Parsea resultado de RPC que a veces viene como string JSON
 */
const parseRpcResult = (data) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
};

/**
 * Lista todos los usuarios del tenant del admin actual
 * @returns {Promise<{success: boolean, users?: Array, error?: string}>}
 */
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

/**
 * Resetea la contraseña de un usuario
 * @param {string} userId - UUID del usuario
 * @param {string} newPassword - Nueva contraseña (mínimo 6 caracteres)
 */
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

/**
 * Actualiza datos de un usuario
 * @param {string} userId - UUID del usuario
 * @param {object} updates - { first_name, last_name, phone_number, role_name, is_active }
 */
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

/**
 * Helper: genera una contraseña aleatoria de 8 caracteres
 * útil para el botón "Generar contraseña temporal"
 */
export const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + '!';
};
