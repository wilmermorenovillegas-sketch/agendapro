// ═══════════════════════════════════════════════════════════════
// pages/admin/TenantLimitsPage.jsx
// Página para ver límites y uso del tenant
//
// FIX 26-04-2026: corregido bug del IconComponent no definido
//   - Antes: el render usaba <IconComponent /> pero la función recibía
//     el ícono en el parámetro `icon` (con minúscula). Resultado:
//     ReferenceError que rompía toda la app.
//   - Ahora: el ícono se asigna a una variable local con mayúscula
//     inicial (requisito de React para renderizar componentes
//     pasados como prop) y se usa esa variable.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { getTenantLimits } from '../../services/tenantLimitsService';
import { Users, Calendar, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TenantLimitsPage() {
  const [limits, setLimits] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const data = await getTenantLimits();
      setLimits(data.limits);
      setUsage(data.usage);
    } catch (error) {
      toast.error('Error al cargar límites');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (current, max) => {
    if (!max || max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  const getUsageStatus = (percentage) => {
    if (percentage >= 90) return { color: 'red', label: 'Crítico', icon: AlertTriangle };
    if (percentage >= 80) return { color: 'yellow', label: 'Alto', icon: AlertTriangle };
    return { color: 'green', label: 'Normal', icon: CheckCircle };
  };

  // ─────────────────────────────────────────────────────────────
  // renderLimitCard
  // Recibe `icon` como un componente de lucide-react (Users, Calendar, etc.)
  // y lo asigna a `IconComponent` (mayúscula inicial obligatoria
  // para que React lo trate como componente y no como string).
  // ─────────────────────────────────────────────────────────────
  const renderLimitCard = (title, icon, current, max, unit = '') => {
    // Asignar a variable con mayúscula inicial — React requiere esto
    // para renderizar componentes pasados como props
    const IconComponent = icon;

    const percentage = calculatePercentage(current, max);
    const status = getUsageStatus(percentage);
    const StatusIcon = status.icon;

    const colors = {
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        bar: 'bg-red-600',
        icon: 'text-red-600'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        bar: 'bg-yellow-600',
        icon: 'text-yellow-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        bar: 'bg-green-600',
        icon: 'text-green-600'
      }
    };

    const theme = colors[status.color];

    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <IconComponent className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-1 ${theme.bg} ${theme.border} border rounded-full`}>
            <StatusIcon className={`w-4 h-4 ${theme.icon}`} />
            <span className={`text-sm font-medium ${theme.text}`}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-800">
                {current.toLocaleString()}{unit}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                de {max.toLocaleString()}{unit} disponibles
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${theme.text}`}>
                {percentage}%
              </p>
              <p className="text-xs text-slate-500">en uso</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${theme.bar} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Advertencia si está cerca del límite */}
          {percentage >= 80 && (
            <div className={`${theme.bg} ${theme.border} border rounded-lg p-3`}>
              <p className={`text-sm ${theme.text}`}>
                {percentage >= 90 ? (
                  <>
                    <strong>⚠️ Límite casi alcanzado.</strong> Contacta a soporte para aumentar tu plan.
                  </>
                ) : (
                  <>
                    <strong>Acercándote al límite.</strong> Considera optimizar tu uso o contactar a soporte.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!limits || !usage) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">Error al cargar límites del tenant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Límites y Uso
        </h1>
        <p className="text-slate-600">
          Monitorea el uso de tu plan AgendaPro
        </p>
      </div>

      {/* Cards de límites */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderLimitCard(
          'Usuarios',
          Users,
          usage.users,
          limits.max_users
        )}

        {renderLimitCard(
          'Citas este mes',
          Calendar,
          usage.appointments_this_month,
          limits.max_appointments_per_month
        )}

        {renderLimitCard(
          'Almacenamiento',
          HardDrive,
          0, // Por ahora 0, se implementará en Phase 4
          limits.max_storage_mb,
          ' MB'
        )}
      </div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          ¿Necesitas aumentar tus límites?
        </h3>
        <p className="text-blue-800 text-sm mb-4">
          Si tu negocio está creciendo y necesitas más capacidad, contáctanos para
          actualizar tu plan.
        </p>
        <a
          href="mailto:soporte@nexova.pe"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Contactar Soporte
        </a>
      </div>

      {/* Plan actual */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tu Plan Actual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Precio mensual</p>
            <p className="text-2xl font-bold text-teal-600">$100 USD</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Usuarios incluidos</p>
            <p className="text-2xl font-bold text-slate-800">{limits.max_users}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Citas/mes incluidas</p>
            <p className="text-2xl font-bold text-slate-800">
              {limits.max_appointments_per_month}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
