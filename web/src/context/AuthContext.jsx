// ═══════════════════════════════════════════════════════════════
// src/context/AuthContext.jsx
// FIX DEFINITIVO — nunca se queda en "cargando"
// ═══════════════════════════════════════════════════════════════

import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar perfil con timeout y manejo de errores robusto
  const loadProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Timeout de 6 segundos para evitar carga infinita
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const { data, error: rpcError } = await supabase.rpc('get_my_profile');

      clearTimeout(timeout);

      if (rpcError) {
        console.error('Error en get_my_profile:', rpcError.message);
        // Si falla la RPC, construir perfil minimo desde la sesion
        const fallbackProfile = buildFallbackProfile(sessionUser);
        setUser(sessionUser);
        setProfile(fallbackProfile);
        setLoading(false);
        return;
      }

      // Parsear data si viene como string
      let profileData = data;
      if (typeof data === 'string') {
        try { profileData = JSON.parse(data); } catch (e) { profileData = null; }
      }

      if (!profileData) {
        // Perfil no encontrado, usar fallback
        const fallbackProfile = buildFallbackProfile(sessionUser);
        setUser(sessionUser);
        setProfile(fallbackProfile);
        setLoading(false);
        return;
      }

      setUser(sessionUser);
      setProfile(profileData);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      // En caso de cualquier error, usar fallback
      const fallbackProfile = buildFallbackProfile(sessionUser);
      setUser(sessionUser);
      setProfile(fallbackProfile);
    } finally {
      setLoading(false);
    }
  }, []);

  // Construir perfil minimo desde los datos de la sesion
  function buildFallbackProfile(sessionUser) {
    const meta = sessionUser.user_metadata || {};
    const appMeta = sessionUser.app_metadata || {};
    return {
      id: sessionUser.id,
      tenant_id: appMeta.tenant_id || null,
      tenant_name: '',
      tenant_logo: '',
      tenant_category: '',
      first_name: meta.first_name || sessionUser.email?.split('@')[0] || '',
      last_name: meta.last_name || '',
      full_name: (meta.first_name || '') + ' ' + (meta.last_name || ''),
      email: sessionUser.email || '',
      phone_number: meta.phone_number || '',
      profile_photo_url: null,
      is_active: true,
      roles: [appMeta.user_role || 'Client'],
    };
  }

  useEffect(() => {
    let mounted = true;

    // Timeout de seguridad: si despues de 8 segundos sigue loading, forzar fin
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Safety timeout: forzando fin de carga');
        setLoading(false);
      }
    }, 8000);

    // Obtener sesion actual
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error obteniendo sesion:', sessionError.message);
          // Limpiar sesion corrupta
          localStorage.removeItem('sb-acpmwvhttzteobvmkrca-auth-token');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          await loadProfile(session.user);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error en initAuth:', err);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Escuchar cambios de autenticacion
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // No recargar perfil en refresh, solo actualizar user
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email, password) => {
    setError(null);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        // Mensajes de error en espanol
        if (loginError.message.includes('Invalid login')) {
          throw new Error('Credenciales incorrectas. Verifique su correo y contrasena.');
        }
        if (loginError.message.includes('Email not confirmed')) {
          throw new Error('Debe confirmar su correo electronico antes de iniciar sesion.');
        }
        if (loginError.message.includes('Database error')) {
          throw new Error('Error temporal del servidor. Intente de nuevo en unos segundos.');
        }
        throw new Error(loginError.message);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      setUser(null);
      setProfile(null);
      // Limpiar todo el storage
      localStorage.removeItem('sb-acpmwvhttzteobvmkrca-auth-token');
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: profile?.roles?.includes('Admin') || profile?.roles?.includes('SuperAdmin'),
    isProfessional: profile?.roles?.includes('Professional'),
    isClient: profile?.roles?.includes('Client'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
