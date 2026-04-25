// ============================================================
// usePermissions.js - NEXOVA AgendaPro
// Hook para validar permisos del usuario actual
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [user]);

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions');
      
      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (result?.success) {
        const perms = result.permissions || [];
        setPermissions(perms.map(p => p.code));
      }
    } catch (err) {
      console.error('[usePermissions] Error:', err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Verifica si el usuario tiene un permiso específico
  const hasPermission = (permissionCode) => {
    // Admin siempre tiene todos los permisos
    if (isAdmin) return true;
    
    return permissions.includes(permissionCode);
  };

  // Verifica si el usuario tiene ALGUNO de los permisos listados
  const hasAnyPermission = (permissionCodes = []) => {
    if (isAdmin) return true;
    
    return permissionCodes.some(code => permissions.includes(code));
  };

  // Verifica si el usuario tiene TODOS los permisos listados
  const hasAllPermissions = (permissionCodes = []) => {
    if (isAdmin) return true;
    
    return permissionCodes.every(code => permissions.includes(code));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: loadPermissions,
  };
}
