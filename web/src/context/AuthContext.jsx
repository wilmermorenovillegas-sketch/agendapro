// ============================================================
// AuthContext.jsx - NEXOVA AgendaPro
// VERSION: LOGIN-FIX-V3 (24/04/2026) - CORRIGE 3 BUGS:
// 1. Ya no requiere 3 clicks para entrar (elimina doble loadProfile)
// 2. signOut ahora redirige a /login correctamente
// 3. Expone displayRole para que AdminLayout sepa qué mostrar
// ============================================================

import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

console.log('%c[AUTH-V3] AuthContext cargado - version LOGIN-FIX-V3', 'color:#0F766E;font-weight:bold;font-size:14px');

const SUPABASE_AUTH_KEY = 'sb-acpmwvhttzteobvmkrca-auth-token';

const hardReset = () => {
  console.warn('[AUTH-V3] hardReset: limpiando storage');
  try {
    localStorage.removeItem(SUPABASE_AUTH_KEY);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('[AUTH-V3] Error limpiando storage:', e);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    console.log('[AUTH-V3] loadProfile para:', authUser.email);

    try {
      const rpcPromise = supabase.rpc('get_my_profile');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout 5s')), 5000)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (error) throw error;

      let parsedData = data;
      if (typeof data === 'string') {
        try { parsedData = JSON.parse(data); } catch { parsedData = null; }
      }

      if (parsedData) {
        console.log('[AUTH-V3] Perfil OK:', parsedData.email, 'roles:', parsedData.roles);
        setProfile(parsedData);
        return parsedData;
      }

      throw new Error('RPC devolvio null');
    } catch (err) {
      console.warn('[AUTH-V3] loadProfile fallo, fallback:', err.message);

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
        tenant_slug: '',
        phone_number: '',
        profile_photo_url: null,
        is_active: true,
        roles: ['Client'],
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let forcedTimeout = null;

    console.log('[AUTH-V3] Inicializando...');

    forcedTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('[AUTH-V3] TIMEOUT 6s. Forzando loading=false');
        setLoading(false);
      }
    }, 6000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AUTH-V3] Error getSession:', error);
          hardReset();
          if (isMounted) { setUser(null); setProfile(null); setLoading(false); }
          return;
        }

        if (session?.user) {
          console.log('[AUTH-V3] Sesion encontrada:', session.user.email);
          if (isMounted) {
            setUser(session.user);
            await loadProfile(session.user);
          }
        } else {
          console.log('[AUTH-V3] No hay sesion activa');
          if (isMounted) { setUser(null); setProfile(null); }
        }
      } catch (err) {
        console.error('[AUTH-V3] Error en initAuth:', err);
        if (isMounted) { setUser(null); setProfile(null); }
      } finally {
        if (isMounted) {
          console.log('[AUTH-V3] initAuth terminado');
          setLoading(false);
          clearTimeout(forcedTimeout);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH-V3] onAuthStateChange:', event, session?.user?.email || '(sin user)');

        if (!isMounted) return;

        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user);
            setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session?.user) setUser(session.user);
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

  const signIn = async (email, password) => {
    console.log('[AUTH-V3] signIn:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AUTH-V3] signIn error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[AUTH-V3] signIn OK para:', data.user?.email);
      return { success: true, data };
    } catch (err) {
      console.error('[AUTH-V3] signIn excepcion:', err);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  const signUp = async (email, password, firstName, lastName, phoneNumber) => {
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

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  const signOut = async () => {
    console.log('[AUTH-V3] signOut iniciado');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AUTH-V3] signOut error:', err);
    }
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem(SUPABASE_AUTH_KEY);
    } catch {}
    console.log('[AUTH-V3] Redirigiendo a /login');
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const hasRole = (roleName) => profile?.roles?.includes(roleName) ?? false;

  const isAdmin = hasRole('Admin') || hasRole('SuperAdmin');
  const isProfessional = hasRole('Professional');
  const isClient = hasRole('Client');

  const displayRole = (() => {
    if (!profile?.roles || profile.roles.length === 0) return 'Usuario';
    const r = profile.roles[0];
    if (r === 'SuperAdmin') return 'Super Administrador';
    if (r === 'Admin') return 'Administrador';
    if (r === 'Professional') return 'Profesional';
    if (r === 'Client') return 'Cliente';
    return r;
  })();

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isProfessional,
    isClient,
    displayRole,
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
