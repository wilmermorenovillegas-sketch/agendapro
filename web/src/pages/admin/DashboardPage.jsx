// ═══════════════════════════════════════════════════════════════
// src/pages/admin/DashboardPage.jsx
// Dashboard Analítico con KPIs, gráficos y rankings
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';

const PERIODS = [
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'quarter', label: '90 días' },
  { value: 'year', label: '1 año' },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getStats(period);
        setStats(data);
      } catch (err) {
        setError('Error cargando estadísticas: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (loading) {
    return <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (error) {
    return <div className="p-6"><div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div></div>;
  }

  const s = stats || {};

  return (
    <div className="p-6">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">
              ¡Hola, {profile?.first_name}!
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Panel de {profile?.tenant_name}
            </p>
          </div>
          {/* Selector de período */}
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

        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon="📅" label="Citas Hoy"
            value={s.today_count || 0}
            color="bg-blue-50 text-blue-700"
          />
          <KPICard
            icon="💰" label="Ingresos"
            value={`S/ ${Number(s.revenue || 0).toFixed(0)}`}
            color="bg-green-50 text-green-700"
          />
          <KPICard
            icon="✅" label="Tasa Asistencia"
            value={`${s.attendance_rate || 0}%`}
            color="bg-purple-50 text-purple-700"
          />
          <KPICard
            icon="📊" label={`Citas (${PERIODS.find(p => p.value === period)?.label})`}
            value={s.period_count || 0}
            color="bg-teal-50 text-teal-700"
          />
        </div>

        {/* Resumen de estados */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MiniStat label="Pendientes" value={s.pending || 0} color="text-yellow-600" bg="bg-yellow-50" />
          <MiniStat label="Completadas" value={s.completed || 0} color="text-green-600" bg="bg-green-50" />
          <MiniStat label="Canceladas" value={s.cancelled || 0} color="text-red-600" bg="bg-red-50" />
          <MiniStat label="No asistieron" value={s.no_show || 0} color="text-gray-600" bg="bg-gray-100" />
          <MiniStat label="Clientes" value={s.clients_count || 0} color="text-blue-600" bg="bg-blue-50" />
        </div>

        {/* Gráfico de barras + Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Gráfico de citas por día */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Citas por día (últimos 14 días)
            </h3>
            <BarChart data={s.daily_counts || []} />
          </div>

          {/* Top servicios */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Top Servicios
            </h3>
            {(s.top_services || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {(s.top_services || []).map((svc, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ' +
                      (i === 0 ? 'bg-teal-600' : i === 1 ? 'bg-teal-500' : 'bg-teal-400')}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{svc.name}</div>
                      <div className="text-xs text-gray-400">{svc.total} citas · S/ {Number(svc.revenue).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top profesionales */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Profesionales — Rendimiento
          </h3>
          {(s.top_professionals || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(s.top_professionals || []).map((pro, i) => {
                const completionRate = pro.total > 0 ? Math.round((pro.completed / pro.total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                      {pro.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800">{pro.name}</div>
                      <div className="text-xs text-gray-500">{pro.total} citas · {pro.completed} completadas</div>
                      <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                      </div>
                      <div className="text-[10px] text-teal-600 font-semibold mt-0.5">{completionRate}% completadas</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Componentes auxiliares
// ═══════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg ' + color}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">{label}</div>
          <div className="text-2xl font-bold text-slate-800 font-sora">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color, bg }) {
  return (
    <div className={'rounded-xl p-3 text-center ' + bg}>
      <div className={'text-xl font-bold font-sora ' + color}>{value}</div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Sin datos aún. Las citas completadas aparecerán aquí.</p>;
  }

  const maxVal = Math.max(...data.map(d => d.total), 1);

  // Llenar los últimos 14 días aunque no haya datos
  const days14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const found = data.find(x => x.day === key);
    days14.push({
      day: key,
      label: `${d.getDate()}/${d.getMonth()+1}`,
      dayName: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()],
      total: found?.total || 0,
      completed: found?.completed || 0,
      cancelled: found?.cancelled || 0,
    });
  }

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: '200px' }}>
        {days14.map((d, i) => {
          const height = maxVal > 0 ? (d.total / maxVal) * 100 : 0;
          const completedH = maxVal > 0 ? (d.completed / maxVal) * 100 : 0;
          const isToday = i === 13;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative group">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{d.dayName} {d.label}</div>
                  <div>Total: {d.total} · Completadas: {d.completed}</div>
                </div>
              </div>
              {/* Barra */}
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '180px' }}>
                <div className="w-full rounded-t-md relative overflow-hidden"
                  style={{ height: `${Math.max(height, 2)}%`, minHeight: d.total > 0 ? '8px' : '2px' }}>
                  <div className={'w-full h-full ' + (isToday ? 'bg-teal-500' : 'bg-teal-300')} />
                  {completedH > 0 && (
                    <div className={'absolute bottom-0 w-full ' + (isToday ? 'bg-teal-700' : 'bg-teal-500')}
                      style={{ height: `${(d.completed / Math.max(d.total, 1)) * 100}%` }} />
                  )}
                </div>
              </div>
              {/* Label */}
              <div className={'text-[9px] font-medium ' + (isToday ? 'text-teal-700 font-bold' : 'text-gray-400')}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-teal-300" /> Total
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-teal-500" /> Completadas
        </div>
      </div>
    </div>
  );
}
