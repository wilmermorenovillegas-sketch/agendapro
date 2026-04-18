// ═══════════════════════════════════════════════════════════════
// src/pages/admin/PerformancePage.jsx
// Rendimiento por Profesional — ranking, estadísticas, métricas
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import performanceService from '../../services/performanceService';

const PERIODS = [
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'quarter', label: '90 días' },
  { value: 'semester', label: '6 meses' },
  { value: 'year', label: '1 año' },
];

export default function PerformancePage() {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await performanceService.getAll(period);
        setData(result || []);
      } catch (err) {
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  // Totales generales
  const totals = data.reduce((acc, p) => ({
    total: acc.total + (p.total || 0),
    completed: acc.completed + (p.completed || 0),
    cancelled: acc.cancelled + (p.cancelled || 0),
    no_show: acc.no_show + (p.no_show || 0),
    revenue: acc.revenue + Number(p.revenue || 0),
    hours: acc.hours + Number(p.hours_worked || 0),
    clients: acc.clients + (p.unique_clients || 0),
  }), { total: 0, completed: 0, cancelled: 0, no_show: 0, revenue: 0, hours: 0, clients: 0 });

  if (loading) {
    return <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Rendimiento</h1>
            <p className="text-sm text-gray-400 mt-1">{data.length} profesionales · {PERIODS.find(p => p.value === period)?.label}</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={'px-3 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                  (period === p.value ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {/* KPIs resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-800 font-sora">{totals.total}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase mt-1">Total citas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600 font-sora">S/ {totals.revenue.toFixed(0)}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase mt-1">Ingresos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 font-sora">{totals.hours.toFixed(0)}h</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase mt-1">Horas trabajadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 font-sora">{totals.clients}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase mt-1">Clientes atendidos</div>
          </div>
        </div>

        {/* Lista de profesionales */}
        {data.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-4xl mb-4 block">👥</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Sin datos de rendimiento</h3>
            <p className="text-gray-400 text-sm">Los datos aparecerán cuando los profesionales tengan citas asignadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((pro, index) => {
              const isExpanded = expanded === pro.professional_id;
              const maxTotal = Math.max(...data.map(d => d.total), 1);
              const barWidth = (pro.total / maxTotal) * 100;

              return (
                <div key={pro.professional_id} className="card overflow-hidden">
                  {/* Fila principal */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : pro.professional_id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Ranking */}
                      <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ' +
                        (index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300')}>
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: pro.color || '#0F766E' }}>
                        {pro.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800">{pro.name}</h3>
                          {pro.specialty && <span className="text-xs text-gray-400">— {pro.specialty}</span>}
                        </div>
                        {/* Barra de progreso */}
                        <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>

                      {/* Métricas rápidas */}
                      <div className="hidden md:flex items-center gap-6 text-center">
                        <div>
                          <div className="text-lg font-bold text-slate-800 font-sora">{pro.total}</div>
                          <div className="text-[9px] text-gray-400 font-semibold uppercase">Citas</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600 font-sora">{pro.attendance_rate}%</div>
                          <div className="text-[9px] text-gray-400 font-semibold uppercase">Asistencia</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-teal-600 font-sora">S/ {Number(pro.revenue).toFixed(0)}</div>
                          <div className="text-[9px] text-gray-400 font-semibold uppercase">Ingresos</div>
                        </div>
                      </div>

                      {/* Flecha */}
                      <svg className={'w-5 h-5 text-gray-400 transition-transform ' + (isExpanded ? 'rotate-180' : '')}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        <StatBox label="Total citas" value={pro.total} color="text-slate-800" />
                        <StatBox label="Completadas" value={pro.completed} color="text-green-600" />
                        <StatBox label="Confirmadas" value={pro.confirmed} color="text-blue-600" />
                        <StatBox label="Canceladas" value={pro.cancelled} color="text-red-600" />
                        <StatBox label="No asistió" value={pro.no_show} color="text-gray-600" />
                        <StatBox label="Pendientes" value={pro.pending} color="text-yellow-600" />
                        <StatBox label="Horas" value={`${Number(pro.hours_worked).toFixed(1)}h`} color="text-purple-600" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="bg-white rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-teal-600 font-sora">S/ {Number(pro.revenue).toFixed(0)}</div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase">Ingresos completados</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-blue-600 font-sora">S/ {Number(pro.total_revenue).toFixed(0)}</div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase">Ingresos totales</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-purple-600 font-sora">{pro.unique_clients}</div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase">Clientes únicos</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-orange-600 font-sora">{pro.services_offered}</div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase">Servicios distintos</div>
                        </div>
                      </div>

                      {/* Barra de asistencia visual */}
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Distribución de citas</div>
                        <div className="flex rounded-full overflow-hidden h-4">
                          {pro.completed > 0 && <div className="bg-green-500" style={{ width: `${(pro.completed / Math.max(pro.total, 1)) * 100}%` }} title={`Completadas: ${pro.completed}`} />}
                          {pro.confirmed > 0 && <div className="bg-blue-400" style={{ width: `${(pro.confirmed / Math.max(pro.total, 1)) * 100}%` }} title={`Confirmadas: ${pro.confirmed}`} />}
                          {pro.pending > 0 && <div className="bg-yellow-400" style={{ width: `${(pro.pending / Math.max(pro.total, 1)) * 100}%` }} title={`Pendientes: ${pro.pending}`} />}
                          {pro.cancelled > 0 && <div className="bg-red-400" style={{ width: `${(pro.cancelled / Math.max(pro.total, 1)) * 100}%` }} title={`Canceladas: ${pro.cancelled}`} />}
                          {pro.no_show > 0 && <div className="bg-gray-400" style={{ width: `${(pro.no_show / Math.max(pro.total, 1)) * 100}%` }} title={`No asistió: ${pro.no_show}`} />}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Completadas</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Confirmadas</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Pendientes</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Canceladas</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />No asistió</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center">
      <div className={'text-lg font-bold font-sora ' + color}>{value}</div>
      <div className="text-[9px] text-gray-400 font-semibold uppercase">{label}</div>
    </div>
  );
}
