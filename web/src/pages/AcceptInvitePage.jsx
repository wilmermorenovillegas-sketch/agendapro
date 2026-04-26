// pages/AcceptInvitePage.jsx
// Página pública para que el usuario acepte su invitación

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { acceptInvitation } from '../services/invitationsService';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validaciones de contraseña
  const validations = {
    length: formData.password.length >= 6,
    match: formData.password === formData.confirmPassword && formData.password.length > 0
  };

  const allValid = validations.length && validations.match;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allValid) {
      setError('Por favor corrige los errores antes de continuar');
      return;
    }

    setLoading(true);

    try {
      await acceptInvitation(token, formData.password);
      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al aceptar la invitación');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-pearl flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            ¡Cuenta creada exitosamente!
          </h2>
          <p className="text-slate-600 mb-6">
            Tu cuenta ha sido activada. Redirigiendo al inicio de sesión...
          </p>
          <div className="animate-pulse flex space-x-2 justify-center">
            <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
            <div className="w-2 h-2 bg-teal-600 rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-teal-600 rounded-full animation-delay-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pearl flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700 mb-2">AgendaPro</h1>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Activa tu cuenta
          </h2>
          <p className="text-slate-600">
            Crea tu contraseña para completar el registro
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Repite tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Validaciones visuales */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Requisitos de contraseña:
            </p>
            <div className="flex items-center space-x-2">
              {validations.length ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-slate-400" />
              )}
              <span className={validations.length ? 'text-green-700 text-sm' : 'text-slate-600 text-sm'}>
                Mínimo 6 caracteres
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {validations.match ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-slate-400" />
              )}
              <span className={validations.match ? 'text-green-700 text-sm' : 'text-slate-600 text-sm'}>
                Las contraseñas coinciden
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading || !allValid}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creando cuenta...' : 'Activar cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
