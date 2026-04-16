// ═══════════════════════════════════════════════════════════════
// src/pages/auth/LoginPage.jsx
// Login — misma UI, ahora usa Supabase Auth directamente
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  const validateField = (name, value) => {
    const errors = { ...formErrors };
    if (name === 'email') {
      if (!value) errors.email = 'El correo es obligatorio';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Correo no válido';
      else delete errors.email;
    }
    if (name === 'password') {
      if (!value) errors.password = 'La contraseña es obligatoria';
      else delete errors.password;
    }
    setFormErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    validateField('email', formData.email);
    validateField('password', formData.password);
    if (!formData.email || !formData.password) return;

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E293B] to-[#0F766E]
                      flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-20 right-10 opacity-5">
          <svg width="300" height="300" viewBox="0 0 80 80">
            <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
        <div className="relative z-10 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto mb-6">
            <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
            <circle cx="40" cy="4" r="4" fill="rgba(255,255,255,0.85)"/>
            <circle cx="68" cy="56" r="4" fill="rgba(255,255,255,0.85)"/>
            <circle cx="12" cy="56" r="4" fill="rgba(255,255,255,0.85)"/>
            <line x1="28" y1="56" x2="28" y2="26" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <line x1="28" y1="26" x2="52" y2="56" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <line x1="52" y1="26" x2="52" y2="56" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <h1 className="text-4xl font-extrabold text-white tracking-widest mb-2 font-sora">NEXOVA</h1>
          <p className="text-sm text-teal-300/60 tracking-wider uppercase">Software Empresarial</p>
          <div className="mt-12 max-w-sm">
            <p className="text-white/80 text-lg font-light leading-relaxed">
              Deje de administrar caos.<br/>
              <span className="text-teal-300 font-semibold">Empiece a dirigir resultados.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Panel formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F4F6F8]">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <svg width="48" height="48" viewBox="0 0 80 80" className="mx-auto mb-3">
              <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="#0F766E" strokeWidth="2"/>
              <line x1="28" y1="56" x2="28" y2="26" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
              <line x1="28" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
              <line x1="52" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <h1 className="text-xl font-extrabold text-[#1E293B] tracking-widest font-sora">NEXOVA</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-[#1E293B] mb-1 font-sora">Iniciar Sesión</h2>
            <p className="text-gray-400 text-sm mb-8">Ingrese sus credenciales para continuar</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1.5">Correo electrónico</label>
                <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange}
                       placeholder="correo@ejemplo.com"
                       className={`input-field ${formErrors.email ? 'input-error' : ''}`} />
                {formErrors.email && <p className="mt-1.5 text-xs text-red-500">{formErrors.email}</p>}
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-600">Contraseña</label>
                  <Link to="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 font-medium">¿Olvidó su contraseña?</Link>
                </div>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                         value={formData.password} onChange={handleChange} placeholder="••••••••"
                         className={`input-field pr-12 ${formErrors.password ? 'input-error' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                          aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                    </svg>
                  </button>
                </div>
                {formErrors.password && <p className="mt-1.5 text-xs text-red-500">{formErrors.password}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ingresando...</>)
                         : 'Iniciar Sesión'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              ¿No tiene cuenta?{' '}
              <Link to="/register" className="text-teal-600 hover:text-teal-700 font-semibold">Regístrese aquí</Link>
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-gray-300">© 2025 NEXOVA · Software Empresarial · Lima, Perú</p>
        </div>
      </div>
    </div>
  );
}
