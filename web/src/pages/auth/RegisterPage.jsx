// ═══════════════════════════════════════════════════════════════
// src/pages/auth/RegisterPage.jsx
// Registro — 2 pasos: elegir rol → formulario
// Ahora usa supabase.auth.signUp() con metadata
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    password: '', confirmPassword: '', role: '', businessName: '', tenantId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateField = (name, value) => {
    const errors = { ...formErrors };
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

    switch (name) {
      case 'firstName':
        if (!value.trim()) errors.firstName = 'El nombre es obligatorio';
        else if (!nameRegex.test(value)) errors.firstName = 'Solo letras y espacios';
        else delete errors.firstName; break;
      case 'lastName':
        if (!value.trim()) errors.lastName = 'El apellido es obligatorio';
        else if (!nameRegex.test(value)) errors.lastName = 'Solo letras y espacios';
        else delete errors.lastName; break;
      case 'email':
        if (!value) errors.email = 'El correo es obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Correo no válido';
        else delete errors.email; break;
      case 'phoneNumber':
        if (!value) errors.phoneNumber = 'El teléfono es obligatorio';
        else if (!/^\+?[0-9]{7,15}$/.test(value)) errors.phoneNumber = 'Formato: +51999999999';
        else delete errors.phoneNumber; break;
      case 'password':
        if (!value) errors.password = 'La contraseña es obligatoria';
        else if (value.length < 8) errors.password = 'Mínimo 8 caracteres';
        else if (!/[A-Z]/.test(value)) errors.password = 'Incluya una mayúscula';
        else if (!/[0-9]/.test(value)) errors.password = 'Incluya un número';
        else delete errors.password;
        if (formData.confirmPassword && value !== formData.confirmPassword)
          errors.confirmPassword = 'Las contraseñas no coinciden';
        else if (formData.confirmPassword) delete errors.confirmPassword;
        break;
      case 'confirmPassword':
        if (!value) errors.confirmPassword = 'Confirme la contraseña';
        else if (value !== formData.password) errors.confirmPassword = 'Las contraseñas no coinciden';
        else delete errors.confirmPassword; break;
      case 'businessName':
        if (formData.role === 'Admin' && !value.trim()) errors.businessName = 'Nombre del negocio obligatorio';
        else delete errors.businessName; break;
      default: break;
    }
    setFormErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
    if (error) clearError();
  };

  const selectRole = (role) => { setFormData((prev) => ({ ...prev, role })); setStep(2); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fields = ['firstName', 'lastName', 'email', 'phoneNumber', 'password', 'confirmPassword'];
    if (formData.role === 'Admin') fields.push('businessName');
    fields.forEach((f) => validateField(f, formData[f]));
    if (fields.some((f) => !formData[f]?.trim()) || Object.keys(formErrors).length > 0) return;

    const result = await signUp(formData);
    if (result.success) navigate('/dashboard', { replace: true });
  };

  const getPasswordStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++; if (/[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++; if (/[^a-zA-Z0-9]/.test(pw)) s++;
    if (s <= 2) return { label: 'Débil', color: 'bg-red-400', width: 'w-1/4' };
    if (s <= 3) return { label: 'Regular', color: 'bg-yellow-400', width: 'w-2/4' };
    if (s <= 4) return { label: 'Buena', color: 'bg-teal-400', width: 'w-3/4' };
    return { label: 'Excelente', color: 'bg-green-500', width: 'w-full' };
  };

  const pwStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F6F8]">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <svg width="44" height="44" viewBox="0 0 80 80" className="mx-auto mb-2">
            <polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="#0F766E" strokeWidth="2"/>
            <line x1="28" y1="56" x2="28" y2="26" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
            <line x1="28" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
            <line x1="52" y1="26" x2="52" y2="56" stroke="#0F766E" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <h1 className="text-lg font-extrabold text-[#1E293B] tracking-widest font-sora">NEXOVA</h1>
        </div>

        <div className="card p-8">
          {/* PASO 1: Elegir rol */}
          {step === 1 && (<>
            <h2 className="text-xl font-bold text-[#1E293B] mb-1 font-sora">Crear Cuenta</h2>
            <p className="text-gray-400 text-sm mb-8">¿Cómo desea usar AgendaPro?</p>
            <div className="space-y-4">
              <button onClick={() => selectRole('Admin')}
                      className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-teal-500 hover:bg-teal-50/30 transition-all text-left group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E293B]">Tengo un negocio</h3>
                    <p className="text-sm text-gray-400 mt-1">Administre citas, profesionales y clientes</p>
                  </div>
                </div>
              </button>
              <button onClick={() => selectRole('Client')}
                      className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-teal-500 hover:bg-teal-50/30 transition-all text-left group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E293B]">Soy cliente</h3>
                    <p className="text-sm text-gray-400 mt-1">Agende citas de forma rápida</p>
                  </div>
                </div>
              </button>
            </div>
            <p className="mt-6 text-center text-sm text-gray-400">
              ¿Ya tiene cuenta?{' '}<Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">Inicie sesión</Link>
            </p>
          </>)}

          {/* PASO 2: Formulario */}
          {step === 2 && (<>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-[#1E293B] font-sora">
                  {formData.role === 'Admin' ? 'Registrar Negocio' : 'Registro de Cliente'}
                </h2>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {formData.role === 'Admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre del negocio *</label>
                  <input name="businessName" type="text" value={formData.businessName} onChange={handleChange}
                         placeholder="Ej: Clínica Dental Sonrisas"
                         className={`input-field ${formErrors.businessName ? 'input-error' : ''}`} />
                  {formErrors.businessName && <p className="mt-1 text-xs text-red-500">{formErrors.businessName}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre *</label>
                  <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} placeholder="Juan"
                         className={`input-field ${formErrors.firstName ? 'input-error' : ''}`} />
                  {formErrors.firstName && <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Apellido *</label>
                  <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} placeholder="Pérez"
                         className={`input-field ${formErrors.lastName ? 'input-error' : ''}`} />
                  {formErrors.lastName && <p className="mt-1 text-xs text-red-500">{formErrors.lastName}</p>}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Correo electrónico *</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com"
                       className={`input-field ${formErrors.email ? 'input-error' : ''}`} />
                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Teléfono *</label>
                <input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} placeholder="+51 999 999 999"
                       className={`input-field ${formErrors.phoneNumber ? 'input-error' : ''}`} />
                {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-500">{formErrors.phoneNumber}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password}
                         onChange={handleChange} placeholder="Mínimo 8 caracteres"
                         className={`input-field pr-12 ${formErrors.password ? 'input-error' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {formErrors.password && <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>}
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${pwStrength.color} ${pwStrength.width} transition-all duration-300 rounded-full`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Fortaleza: <span className="font-medium">{pwStrength.label}</span></p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Confirmar contraseña *</label>
                <div className="relative">
                              <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange}
                                     placeholder="Repita su contraseña"
                                     className={`input-field pr-10 ${formErrors.confirmPassword ? 'input-error' : ''}`} />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{formErrors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando cuenta...</>)
                         : formData.role === 'Admin' ? 'Crear mi Negocio' : 'Crear mi Cuenta'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-400">
              ¿Ya tiene cuenta?{' '}<Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">Inicie sesión</Link>
            </p>
          </>)}
        </div>
        <p className="mt-4 text-center text-xs text-gray-300">© 2025 NEXOVA · Software Empresarial · Lima, Perú</p>
      </div>
    </div>
  );
}
