// ═══════════════════════════════════════════════════════════════
// src/pages/admin/DashboardPage.jsx
// Dashboard Analítico con gráficos variados
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import serviceService from '../../services/serviceService';
import OnboardingWizard from '../../components/admin/OnboardingWizard';

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

  // Onboarding: mostrar si no hay servicios y no se completó antes
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Carga stats y conteo de servicios en paralelo
        const [statsData, svcCount] = await Promise.all([
          dashboardService.getStats(period),
          serviceService.count(),
        ]);
        setStats(statsData);

        // Mostrar wizard si no hay servicios y no fue completado antes
        if (svcCount === 0 && profile?.tenant_id) {
          const flag = localStorage.getItem(`agendapro_onboarding_v1_${profile.tenant_id}`);
          if (!flag) setShowOnboarding(true);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-6"><div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div></div>;

  const s = stats || {};

  return (
    <div className="p-6">
      {/* ═══ WIZARD DE ONBOARDING ═══ */}
      {showOnboarding && (
        <OnboardingWizard
          tenantId={profile?.tenant_id}
          tenantSlug={profile?.tenant_slug}
          onClose={() => {
            setShowOnboarding(false);
            setOnboardingDismissed(true);
            if (profile?.tenant_id) {
              localStorage.setItem(`agendapro_onboarding_v1_${profile.tenant_id}`, 'done');
            }
          }}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div className="max-w-6xl">

        {/* ═══ BANNER DE BIENVENIDA (sin servicios, wizard descartado) ═══ */}
        {!showOnboarding && !onboardingDismissed && s.services_count === 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-2xl flex items-center gap-4">
            <div className="text-3xl shrink-0">🚀</div>
            <div className="flex-1 min-w-0">
              <p className="font-sora font-bold text-teal-800 text-sm">¡Tu negocio está casi listo!</p>
              <p className="text-teal-700 text-xs mt-0.5">Configura tus servicios para empezar a recibir citas en línea.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="shrink-0 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
              Configurar ahora
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-sora">¡Hola, {profile?.first_name}!</h1>
            <p className="text-sm text-gray-400 mt-1">Panel de {profile?.tenant_name}</p>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard icon="📅" label="Citas Hoy" value={s.today_count || 0} color="bg-blue-50 text-blue-600" />
          <KPICard icon="💰" label="Ingresos" value={`S/ ${Number(s.revenue || 0).toFixed(0)}`} color="bg-green-50 text-green-600" />
          <KPICard icon="✅" label="Asistencia" value={`${s.attendance_rate || 0}%`} color="bg-purple-50 text-purple-600" />
          <KPICard icon="📊" label={`Total (${PERIODS.find(p => p.value === period)?.label})`} value={s.period_count || 0} color="bg-teal-50 text-teal-600" />
        </div>

        {/* Fila 2: Donut de estados + Barras diarias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Donut de estados */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Estado de Citas</h3>
            <DonutChart
              data={[
                { label: 'Completadas', value: s.completed || 0, color: '#16A34A' },
                { label: 'Pendientes', value: s.pending || 0, color: '#EAB308' },
                { label: 'Canceladas', value: s.cancelled || 0, color: '#DC2626' },
                { label: 'No asistieron', value: s.no_show || 0, color: '#94A3B8' },
              ]}
              total={s.period_count || 0}
            />
          </div>

          {/* Barras diarias */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Citas por Día (últimos 14 días)</h3>
            <BarChart data={s.daily_counts || []} />
          </div>
        </div>

        {/* Fila 3: Top Servicios (horizontal bars) + Top Profesionales (progress) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Top Servicios - barras horizontales */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Top Servicios</h3>
            <HorizontalBarChart data={s.top_services || []} />
          </div>

          {/* Top Profesionales - progress cards */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Profesionales</h3>
            <ProfessionalCards data={s.top_professionals || []} />
          </div>
        </div>

        {/* Fila 4: Métricas rápidas */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          <MiniGauge label="Clientes" value={s.clients_count || 0} max={100} color="#2563EB" />
          <MiniGauge label="Profesionales" value={s.professionals_count || 0} max={20} color="#7C3AED" />
          <MiniGauge label="Completadas" value={s.completed || 0} max={Math.max(s.period_count || 1, 1)} color="#16A34A" />
          <MiniGauge label="Canceladas" value={s.cancelled || 0} max={Math.max(s.period_count || 1, 1)} color="#DC2626" />
          <MiniGauge label="No asistieron" value={s.no_show || 0} max={Math.max(s.period_count || 1, 1)} color="#94A3B8" />
        </div>
      </div>
    </div>
  );
}

// ═══ COMPONENTES DE GRÁFICOS ═══

function KPICard({ icon, label, value, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg ' + color}>{icon}</div>
        <div>
          <div className="text-xs text-gray-400 font-medium">{label}</div>
          <div className="text-2xl font-bold text-slate-800 font-sora">{value}</div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ data, total }) {
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>;

  const size = 160;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        {data.filter(d => d.value > 0).map((d, i) => {
          const pct = d.value / total;
          const dash = circumference * pct;
          const gap = circumference - dash;
          const seg = <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={d.color} strokeWidth={stroke} strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset} strokeLinecap="butt" />;
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="text-3xl font-bold text-slate-800 font-sora -mt-24 mb-16">{total}</div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600">{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-12">Sin datos aún</p>;

  const days14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const found = data.find(x => x.day === key);
    days14.push({
      label: `${d.getDate()}/${d.getMonth()+1}`,
      total: found?.total || 0,
      completed: found?.completed || 0,
      isToday: i === 0,
    });
  }

  const maxVal = Math.max(...days14.map(d => d.total), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: '180px' }}>
        {days14.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                {d.label}: {d.total} citas ({d.completed} comp.)
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-end" style={{ height: '160px' }}>
              <div className={'w-full rounded-t-md transition-all ' + (d.isToday ? 'bg-teal-500' : 'bg-teal-300 hover:bg-teal-400')}
                style={{ height: `${Math.max((d.total / maxVal) * 100, d.total > 0 ? 8 : 2)}%`, minHeight: '2px' }} />
            </div>
            <div className={'text-[9px] font-medium mt-1 ' + (d.isToday ? 'text-teal-700 font-bold' : 'text-gray-400')}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const colors = ['#0F766E', '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4'];

  return (
    <div className="space-y-3">
      {data.map((svc, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-800 truncate flex-1">{svc.name}</span>
            <span className="text-xs text-gray-500 ml-2">{svc.total} citas · S/ {Number(svc.revenue).toFixed(0)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full transition-all" 
              style={{ width: `${(svc.total / maxVal) * 100}%`, backgroundColor: colors[i] || colors[0] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfessionalCards({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>;

  return (
    <div className="space-y-3">
      {data.map((pro, i) => {
        const rate = pro.total > 0 ? Math.round((pro.completed / pro.total) * 100) : 0;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs">
              {pro.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{pro.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${rate}%` }} />
                </div>
                <span className="text-xs font-semibold text-teal-600">{rate}%</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{pro.total} citas · {pro.completed} comp.</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniGauge({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const half = circ / 2;
  const filled = (pct / 100) * half;

  return (
    <div className="card p-3 text-center">
      <svg width="80" height="50" viewBox="0 0 80 50" className="mx-auto">
        <path d="M 10 45 A 30 30 0 0 1 70 45" fill="none" stroke="#F1F5F9" strokeWidth="6" strokeLinecap="round" />
        <path d="M 10 45 A 30 30 0 0 1 70 45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${filled} ${half}`} />
      </svg>
      <div className="text-lg font-bold text-slate-800 font-sora -mt-2">{value}</div>
      <div className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">{label}</div>
    </div>
  );
}
