// ═══════════════════════════════════════════════════════════════
// src/pages/auth/LoginPage.jsx
// Login con usuarios demo para pruebas
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DEMO_USERS = [
  {
    label: 'Administrador',
    email: 'wilmermor07@gmail.com',
    password: 'Donato12@',
    role: 'Admin',
    color: 'bg-teal-600',
    icon: '\ud83d\udc51',
    desc: 'Panel completo con todas las funciones',
  },
  {
    label: 'Profesional',
    email: 'wilmer.moreno2026@outlook.com',
    password: 'Donato12@',
    role: 'Professional',
    color: 'bg-blue-600',
    icon: '\ud83d\udc68\u200d\u2695\ufe0f',
    desc: 'Vista de citas y calendario asignado',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ingrese su correo y contrasena.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoUser) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg width="48" height="48" viewBox="0 0 80 80">
            <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="#0F766E" strokeWidth="2" />
            <circle cx="40" cy="4" r="3.5" fill="#0F766E" />
            <circle cx="68" cy="20" r="3.5" fill="#0D9488" />
            <circle cx="12" cy="56" r="3.5" fill="#0F766E" />
            <line x1="28" y1="56" x2="28" y2="26" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
            <line x1="28" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
            <line x1="52" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-sora font-bold text-2xl text-slate-800 tracking-widest">NEXOVA</h1>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-slate-800 font-sora mb-1">Iniciar Sesion</h2>
        <p className="text-sm text-gray-400 mb-6">Ingrese sus credenciales para continuar</p>

        {/* Usuarios demo */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Acceso rapido (demo)</p>
          <div className="flex gap-2">
            {DEMO_USERS.map((du) => (
              <button
                key={du.role}
                onClick={() => handleDemoLogin(du)}
                className={'flex-1 p-3 rounded-xl border-2 transition-all text-left hover:shadow-md ' +
                  (email === du.email ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-gray-200')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{du.icon}</span>
                  <span className="text-sm font-bold text-slate-800">{du.label}</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">{du.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <span className="text-red-500 text-sm mt-0.5">!</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <div onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Contrasena</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Su contrasena"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" />
                  ) : (
                    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ingresando...</>
            ) : 'Iniciar Sesion'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            No tiene cuenta? <Link to="/register" className="text-teal-600 font-semibold hover:underline">Registrese aqui</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400">2025 NEXOVA - Software Empresarial - Lima, Peru</p>
    </div>
  );
}
