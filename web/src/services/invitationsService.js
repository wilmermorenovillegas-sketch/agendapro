// services/invitationsService.js
// Servicio para gestión de invitaciones de usuarios

import { supabase } from '../config/supabaseClient';

/**
 * Admin invita a un nuevo usuario
 */
export const inviteUser = async (email, roleName, firstName, lastName, phoneNumber) => {
  try {
    const { data, error } = await supabase.rpc('admin_invite_user', {
      p_email: email,
      p_role_name: roleName,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_phone_number: phoneNumber || null
    });

    if (error) throw error;

    // La RPC puede retornar JSON como string
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al enviar invitación');
    }

    return result;
  } catch (error) {
    console.error('Error en inviteUser:', error);
    throw error;
  }
};

/**
 * Usuario acepta invitación y crea su cuenta
 */
export const acceptInvitation = async (token, password) => {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_password: password
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al aceptar invitación');
    }

    return result;
  } catch (error) {
    console.error('Error en acceptInvitation:', error);
    throw error;
  }
};

/**
 * Lista invitaciones del tenant (con filtro opcional por estado)
 */
export const listInvitations = async (status = null) => {
  try {
    const { data, error } = await supabase.rpc('admin_list_invitations', {
      p_status: status
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al listar invitaciones');
    }

    return result.invitations || [];
  } catch (error) {
    console.error('Error en listInvitations:', error);
    throw error;
  }
};

/**
 * Admin cancela una invitación pendiente
 */
export const cancelInvitation = async (invitationId, reason = null) => {
  try {
    const { data, error } = await supabase.rpc('admin_cancel_invitation', {
      p_invitation_id: invitationId,
      p_reason: reason
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      throw new Error(result.error || 'Error al cancelar invitación');
    }

    return result;
  } catch (error) {
    console.error('Error en cancelInvitation:', error);
    throw error;
  }
};
