// ═══════════════════════════════════════════════════════════════
// src/context/AuthContext.jsx
// Context de autenticación con Supabase Auth
// CON TIMEOUT AUTOMÁTICO - si la sesión está rota, se limpia sola
// ═══════════════════════════════════════════════════════════════

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

// Timeout de carga: si tarda más que esto, asumir sesión rota y limpiar
const LOAD_TIMEOUT_MS = 8000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Cargar perfil extendido con timeout ──
  const loadProfile = useCallback(async (userId) => {
    try {
      // Usar función RPC (SECURITY DEFINER) para bypass RLS en auth.users
      const { data, error: profileError } = await supabase.rpc('get_my_profile');

      if (profileError) {
        console.error('Error cargando perfil:', profileError.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Error cargando perfil:', err);
      return null;
    }
  }, []);

  // ── Limpieza automática de sesión rota ──
  const clearBrokenSession = useCallback(async () => {
    console.warn('Sesión rota detectada, limpiando automáticamente...');
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    // Limpiar storage por si quedó algo
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  // ── Inicializar sesión al montar ──
  useEffect(() => {
    let timeoutId = null;
    let cancelled = false;

    const initSession = async () => {
      // Timer de seguridad: si tras N ms sigue cargando, limpiar
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        console.warn('Timeout cargando sesión, limpiando...');
        clearBrokenSession();
      }, LOAD_TIMEOUT_MS);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError);
          await clearBrokenSession();
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const prof = await loadProfile(session.user.id);
          if (cancelled) return;

          // Si no se pudo cargar el perfil, la sesión está rota
          if (!prof) {
            await clearBrokenSession();
            return;
          }
          setProfile(prof);
        }

        clearTimeout(timeoutId);
        setLoading(false);
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        if (!cancelled) await clearBrokenSession();
      }
    };

    initSession();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const prof = await loadProfile(session.user.id);
          setProfile(prof);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadProfile, clearBrokenSession]);

  // ══════════════════════════════════════════════════════════
  // ACCIONES
  // ══════════════════════════════════════════════════════════

  const register = useCallback(async ({
    email, password, firstName, lastName, phoneNumber, role, businessName, tenantId,
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            role: role,
            business_name: businessName || null,
            tenant_id: tenantId || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { success: false, message: signUpError.message };
      }

      return { success: true, data };
    } catch (err) {
      const message = 'Error de conexión. Intente nuevamente.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email, password,
      });

      if (signInError) {
        let message = signInError.message;
        if (message.includes('Invalid login credentials')) {
          message = 'Credenciales incorrectas. Verifique su correo y contraseña.';
        } else if (message.includes('Email not confirmed')) {
          message = 'Debe confirmar su correo electrónico antes de iniciar sesión.';
        }
        setError(message);
        setLoading(false);
        return { success: false, message };
      }

      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { success: true, data };
    } catch (err) {
      const message = 'Error de conexión. Intente nuevamente.';
      setError(message);
      setLoading(false);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const contextValue = useMemo(() => ({
    user, profile, loading, error,
    isAuthenticated: !!user,
    login, register, logout, clearError,
    hasRole: (role) => profile?.roles?.includes(role) ?? false,
    isSuperAdmin: profile?.roles?.includes('SuperAdmin') ?? false,
    isAdmin: profile?.roles?.includes('Admin') ?? false,
    isProfessional: profile?.roles?.includes('Professional') ?? false,
    isClient: profile?.roles?.includes('Client') ?? false,
  }), [user, profile, loading, error, login, register, logout, clearError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
