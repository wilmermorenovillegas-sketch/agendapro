// ============================================================
// AuthContext.jsx - NEXOVA AgendaPro
// VERSION: LOGIN-FIX-V2 (subido el 24/04/2026)
// Contexto de autenticacion BLINDADO
// - Timeout duro de 6s (evita cargando infinito)
// - Auto-limpieza de sesion corrupta
// - Logs claros en consola (prefijo [AUTH-V2])
// - Perfil fallback si get_my_profile falla
// ============================================================

import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

// Marcador unico que nos permite verificar si el archivo nuevo esta en produccion
console.log('%c[AUTH-V2] AuthContext cargado - version LOGIN-FIX-V2', 'color:#0F766E;font-weight:bold;font-size:14px');

// Clave del item de Supabase en localStorage (para limpiar si hay corrupcion)
const SUPABASE_AUTH_KEY = 'sb-acpmwvhttzteobvmkrca-auth-token';

// Helper: limpia toda la sesion local
const hardReset = () => {
  console.warn('[AUTH-V2] Ejecutando hardReset: limpiando localStorage');
  try {
    localStorage.removeItem(SUPABASE_AUTH_KEY);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('[AUTH-V2] Error limpiando storage:', e);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------
  // Carga el perfil del usuario via RPC get_my_profile()
  // ----------------------------------------------------------
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      console.log('[AUTH-V2] loadProfile: no hay authUser');
      setProfile(null);
      return null;
    }

    console.log('[AUTH-V2] loadProfile: llamando RPC para', authUser.email);

    try {
      const rpcPromise = supabase.rpc('get_my_profile');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout 5s')), 5000)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (error) {
        console.error('[AUTH-V2] RPC error:', error);
        throw error;
      }

      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = null;
        }
      }

      if (parsedData) {
        console.log('[AUTH-V2] Perfil OK:', parsedData.email, 'roles:', parsedData.roles);
        setProfile(parsedData);
        return parsedData;
      }

      throw new Error('RPC devolvio null');
    } catch (err) {
      console.warn('[AUTH-V2] loadProfile fallo, usando fallback:', err.message);

      const fallbackProfile = {
        id: authUser.id,
        email: authUser.email || '',
        first_name: '',
        last_name: '',
        full_name: authUser.email?.split('@')[0] || 'Usuario',
        tenant_id: null,
        tenant_name: '',
        tenant_logo: '',
        tenant_category: '',
        phone_number: '',
        profile_photo_url: null,
        is_active: true,
        roles: ['Client'],
      };

      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  // ----------------------------------------------------------
  // Inicializacion: TIMEOUT DURO de 6s
  // ----------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let forcedTimeout = null;

    console.log('[AUTH-V2] Inicializando...');

    forcedTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('[AUTH-V2] TIMEOUT 6s alcanzado. Forzando loading=false');
        setLoading(false);
      }
    }, 6000);

    const initAuth = async () => {
      try {
        console.log('[AUTH-V2] Obteniendo sesion actual...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AUTH-V2] Error getSession:', error);
          hardReset();
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('[AUTH-V2] Sesion encontrada:', session.user.email);
          if (isMounted) setUser(session.user);
          await loadProfile(session.user);
        } else {
          console.log('[AUTH-V2] No hay sesion activa');
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('[AUTH-V2] Error en initAuth:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('[AUTH-V2] initAuth terminado, loading=false');
          setLoading(false);
          clearTimeout(forcedTimeout);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH-V2] onAuthStateChange:', event, session?.user?.email || '(sin user)');

        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      if (forcedTimeout) clearTimeout(forcedTimeout);
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  // ----------------------------------------------------------
  // Login con email + password
  // ----------------------------------------------------------
  const signIn = async (email, password) => {
    console.log('[AUTH-V2] signIn intentando con:', email);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AUTH-V2] signIn error:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      console.log('[AUTH-V2] signIn OK:', data.user?.email);
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
      }
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      console.error('[AUTH-V2] signIn excepcion:', err);
      setLoading(false);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  // ----------------------------------------------------------
  // Registro
  // ----------------------------------------------------------
  const signUp = async (email, password, firstName, lastName, phoneNumber) => {
    console.log('[AUTH-V2] signUp:', email);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
          },
        },
      });

      if (error) {
        console.error('[AUTH-V2] signUp error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[AUTH-V2] signUp excepcion:', err);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  // ----------------------------------------------------------
  // Cerrar sesion
  // ----------------------------------------------------------
  const signOut = async () => {
    console.log('[AUTH-V2] signOut');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AUTH-V2] signOut error:', err);
    }
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem(SUPABASE_AUTH_KEY);
    } catch {}
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  // ----------------------------------------------------------
  // Helpers de rol
  // ----------------------------------------------------------
  const hasRole = (roleName) => {
    return profile?.roles?.includes(roleName) ?? false;
  };

  const isAdmin = hasRole('Admin') || hasRole('SuperAdmin');
  const isProfessional = hasRole('Professional');
  const isClient = hasRole('Client');

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isProfessional,
    isClient,
    hasRole,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
