// ============================================================
// AuthContext.jsx - NEXOVA AgendaPro
// Contexto de autenticación BLINDADO
// - Timeout duro de 6s (evita cargando infinito)
// - Auto-limpieza de sesión corrupta
// - Logs claros en consola (prefijo [AUTH])
// - Perfil fallback si get_my_profile falla
// ============================================================

import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

// Clave del item de Supabase en localStorage (para limpiar si hay corrupción)
const SUPABASE_AUTH_KEY = 'sb-acpmwvhttzteobvmkrca-auth-token';

// Helper: limpia toda la sesión local y recarga
const hardReset = () => {
  console.warn('[AUTH] Ejecutando hardReset: limpiando localStorage y recargando');
  try {
    localStorage.removeItem(SUPABASE_AUTH_KEY);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('[AUTH] Error limpiando storage:', e);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------
  // Carga el perfil del usuario vía RPC get_my_profile()
  // Si falla, devuelve perfil mínimo para no bloquear la app
  // ----------------------------------------------------------
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      console.log('[AUTH] loadProfile: no hay authUser, limpiando perfil');
      setProfile(null);
      return null;
    }

    console.log('[AUTH] loadProfile: llamando RPC get_my_profile para', authUser.email);

    try {
      // Timeout de 5s para la llamada RPC (por si Supabase cuelga)
      const rpcPromise = supabase.rpc('get_my_profile');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout 5s')), 5000)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (error) {
        console.error('[AUTH] RPC error:', error);
        throw error;
      }

      // Parseo defensivo: a veces RPC devuelve string JSON
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = null;
        }
      }

      if (parsedData) {
        console.log('[AUTH] Perfil cargado OK:', parsedData.email, 'roles:', parsedData.roles);
        setProfile(parsedData);
        return parsedData;
      }

      // Si RPC devuelve null, usar perfil fallback
      throw new Error('RPC devolvió null');
    } catch (err) {
      console.warn('[AUTH] loadProfile falló, usando perfil fallback:', err.message);

      // Perfil mínimo de emergencia (usuario puede entrar con rol Client)
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
  // Inicialización: recupera sesión existente
  // TIMEOUT DURO: si no termina en 6s, fuerza loading=false
  // ----------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let forcedTimeout = null;

    console.log('[AUTH] Inicializando AuthContext...');

    // Timeout duro: a los 6s, si todavía loading, forzar salida
    forcedTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('[AUTH] TIMEOUT 6s alcanzado. Forzando loading=false');
        setLoading(false);
      }
    }, 6000);

    const initAuth = async () => {
      try {
        console.log('[AUTH] Obteniendo sesión actual...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AUTH] Error getSession:', error);
          // Si hay error de sesión, limpiar y permitir login fresco
          hardReset();
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('[AUTH] Sesión encontrada para:', session.user.email);
          if (isMounted) setUser(session.user);
          await loadProfile(session.user);
        } else {
          console.log('[AUTH] No hay sesión activa');
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('[AUTH] Error en initAuth:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('[AUTH] initAuth terminado, loading=false');
          setLoading(false);
          clearTimeout(forcedTimeout);
        }
      }
    };

    initAuth();

    // ----------------------------------------------------------
    // Suscripción a cambios de autenticación (login, logout, refresh)
    // ----------------------------------------------------------
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] onAuthStateChange:', event, session?.user?.email || '(sin user)');

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
    console.log('[AUTH] signIn intentando con:', email);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AUTH] signIn error:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      console.log('[AUTH] signIn OK para:', data.user?.email);
      // onAuthStateChange se encargará de setear user + profile + loading=false
      // Pero por si no llega a tiempo, lo hacemos aquí también
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
      }
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      console.error('[AUTH] signIn excepción:', err);
      setLoading(false);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  // ----------------------------------------------------------
  // Registro de nuevo usuario (rol Client por defecto)
  // ----------------------------------------------------------
  const signUp = async (email, password, firstName, lastName, phoneNumber) => {
    console.log('[AUTH] signUp intentando con:', email);

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
        console.error('[AUTH] signUp error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[AUTH] signUp OK:', data.user?.email);
      return { success: true, data };
    } catch (err) {
      console.error('[AUTH] signUp excepción:', err);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  // ----------------------------------------------------------
  // Cerrar sesión
  // ----------------------------------------------------------
  const signOut = async () => {
    console.log('[AUTH] signOut');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AUTH] signOut error:', err);
    }
    setUser(null);
    setProfile(null);
    // Forzar limpieza total por si quedó algo
    try {
      localStorage.removeItem(SUPABASE_AUTH_KEY);
    } catch {}
  };

  // ----------------------------------------------------------
  // Reintentar carga de perfil (útil desde UI si falló)
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // Valor del contexto
  // ----------------------------------------------------------
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
