// ============================================================
// LoginPage.jsx - NEXOVA AgendaPro
// VERSION: LOGIN-FIX-V3 (24/04/2026)
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

console.log('%c[LOGIN-V3] LoginPage cargado', 'color:#0F766E;font-weight:bold;font-size:14px');

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { signIn, isAuthenticated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && profile) {
      const from = location.state?.from?.pathname;
      const roles = profile.roles || [];

      let target = '/admin/dashboard';

      if (roles.includes('Admin') || roles.includes('SuperAdmin')) {
        target = from && from !== '/login' ? from : '/admin/dashboard';
      } else if (roles.includes('Professional')) {
        target = '/admin/appointments';
      } else if (roles.includes('Client')) {
        target = '/';
      }

      console.log('[LOGIN-V3] Autenticado, redirigiendo a:', target);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, loading, profile, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Por favor ingresa email y contrasena');
      return;
    }

    setSubmitting(true);
    const result = await signIn(email.trim().toLowerCase(), password);

    if (!result.success) {
      let msg = result.error || 'Error al iniciar sesion';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email o contrasena incorrectos';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Email no confirmado';
      } else if (msg.toLowerCase().includes('network')) {
        msg = 'Error de conexion. Verifica tu internet.';
      }
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const loginDemo = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
    setSubmitting(true);

    const result = await signIn(demoEmail, demoPassword);

    if (!result.success) {
      setErrorMsg(result.error || 'Error al iniciar sesion demo');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #F4F6F8 0%, #CCFBF1 100%)' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#0F766E]/20 border-t-[#0F766E] rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        fontFamily: 'DM Sans, sans-serif',
        background: 'linear-gradient(135deg, #F4F6F8 0%, #CCFBF1 100%)',
      }}
    >
      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#0F766E] text-white text-[10px] font-bold tracking-widest shadow-md">
        LOGIN-FIX-V3
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
               style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}>
            <svg width="36" height="36" viewBox="0 0 80 80">
              <line x1="28" y1="56" x2="28" y2="26" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <line x1="28" y1="26" x2="52" y2="56" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <line x1="52" y1="26" x2="52" y2="56" stroke="white" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-widest"
              style={{ fontFamily: 'Sora, sans-serif', color: '#0F766E' }}>
            AGENDAPRO
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-widest font-semibold">
            POR NEXOVA SOFTWARE EMPRESARIAL
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold mb-1 text-slate-800"
              style={{ fontFamily: 'Sora, sans-serif' }}>
            Iniciar sesion
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Accede a tu panel de gestion
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {submitting && (
            <div className="mb-4 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-sm flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin"></div>
              <span>Verificando credenciales y cargando perfil...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none transition text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">
                CONTRASENA
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 pr-20 rounded-lg border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none transition text-sm disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#0F766E] hover:text-[#0D9488]"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg font-bold text-white tracking-wide shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #0F766E, #0D9488)',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              {submitting ? 'INGRESANDO...' : 'INGRESAR'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs font-semibold text-slate-400 tracking-widest">ACCESO DEMO</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => loginDemo('wilmermor07@gmail.com', 'Donato12@')}
              disabled={submitting}
              className="py-2.5 rounded-lg text-xs font-bold tracking-wide border-2 border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E] hover:text-white transition disabled:opacity-50"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => loginDemo('wilmer.moreno2026@outlook.com', 'Donato12@')}
              disabled={submitting}
              className="py-2.5 rounded-lg text-xs font-bold tracking-wide border-2 border-slate-600 text-slate-600 hover:bg-slate-600 hover:text-white transition disabled:opacity-50"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              PROFESIONAL
            </button>
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-[#0F766E] hover:text-[#0D9488]">
              Registrate
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-slate-400">
          2026 NEXOVA Software Empresarial - Lima, Peru
        </p>
      </div>
    </div>
  );
}
