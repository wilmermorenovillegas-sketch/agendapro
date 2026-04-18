// ═══════════════════════════════════════════════════════════════
// src/pages/admin/ReportsPage.jsx
// Reportes PDF + Análisis IA del Dashboard
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import aiService from '../../services/aiService';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // IA
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // PDF
  const reportRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getStats(period);
        setStats(data);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, [period]);

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const analysisData = await aiService.getAnalysisData();
      const analysis = await aiService.generateAnalysis(analysisData);
      setAiAnalysis(analysis);
      setAiGenerated(true);
    } catch (err) {
      setError('Error generando análisis: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const PERIOD_LABELS = { week: '7 días', month: '30 días', quarter: '90 días', year: '1 año' };
  const s = stats || {};

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
            <h1 className="text-2xl font-bold text-slate-800 font-sora">Reportes e Inteligencia</h1>
            <p className="text-sm text-gray-400 mt-1">Genera reportes PDF y análisis inteligente de tu negocio</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field py-2 text-sm w-auto">
              <option value="week">7 días</option>
              <option value="month">30 días</option>
              <option value="quarter">90 días</option>
              <option value="year">1 año</option>
            </select>
            <button onClick={handlePrintPDF} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
              🖨️ Imprimir / PDF
            </button>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>}

        {/* ═══ REPORTE IMPRIMIBLE ═══ */}
        <div ref={reportRef} id="printable-report">
          {/* Encabezado del reporte */}
          <div className="card p-6 mb-4 print-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 font-sora">{profile?.tenant_name}</h2>
                <p className="text-sm text-gray-400 mt-1">Reporte de rendimiento — {PERIOD_LABELS[period] || period}</p>
                <p className="text-xs text-gray-400 mt-1">Generado el {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-600 font-sora">NEXOVA</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">AgendaPro</div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <ReportKPI label="Citas del período" value={s.period_count || 0} icon="📅" />
            <ReportKPI label="Ingresos" value={`S/ ${Number(s.revenue || 0).toFixed(0)}`} icon="💰" />
            <ReportKPI label="Tasa asistencia" value={`${s.attendance_rate || 0}%`} icon="✅" />
            <ReportKPI label="Citas hoy" value={s.today_count || 0} icon="📊" />
          </div>

          {/* Estados */}
          <div className="card p-5 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Distribución por Estado</h3>
            <div className="grid grid-cols-5 gap-3">
              <StatusBox label="Pendientes" value={s.pending || 0} color="bg-yellow-50 text-yellow-600" />
              <StatusBox label="Completadas" value={s.completed || 0} color="bg-green-50 text-green-600" />
              <StatusBox label="Canceladas" value={s.cancelled || 0} color="bg-red-50 text-red-600" />
              <StatusBox label="No asistieron" value={s.no_show || 0} color="bg-gray-100 text-gray-600" />
              <StatusBox label="Clientes" value={s.clients_count || 0} color="bg-blue-50 text-blue-600" />
            </div>
          </div>

          {/* Top servicios y profesionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Top Servicios</h3>
              {(s.top_services || []).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {(s.top_services || []).map((svc, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-teal-600">{i + 1}.</span>
                        <span className="text-sm text-slate-800">{svc.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800">{svc.total} citas</span>
                        <span className="text-xs text-gray-400 ml-2">S/ {Number(svc.revenue).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Top Profesionales</h3>
              {(s.top_professionals || []).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {(s.top_professionals || []).map((pro, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-teal-600">{i + 1}.</span>
                        <span className="text-sm text-slate-800">{pro.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800">{pro.total} citas</span>
                        <span className="text-xs text-gray-400 ml-2">{pro.completed} completadas</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Análisis IA */}
          <div className="card p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🤖 Análisis Inteligente</h3>
              {!aiGenerated && (
                <button onClick={handleGenerateAI} disabled={aiLoading}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                  {aiLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analizando...</>
                  ) : '🧠 Generar Análisis IA'}
                </button>
              )}
              {aiGenerated && (
                <button onClick={handleGenerateAI} disabled={aiLoading}
                  className="btn-secondary px-4 py-2 text-sm">
                  {aiLoading ? 'Analizando...' : '🔄 Regenerar'}
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Analizando datos de tu negocio...</p>
                  <p className="text-xs text-gray-400 mt-1">Esto puede tomar unos segundos</p>
                </div>
              </div>
            )}

            {!aiLoading && !aiAnalysis && (
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">🧠</span>
                <p className="text-sm text-gray-500">Click en <strong>"Generar Análisis IA"</strong> para obtener un análisis inteligente de tu negocio con recomendaciones personalizadas.</p>
              </div>
            )}

            {aiAnalysis && (
              <div className="prose prose-sm max-w-none">
                <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
                  {aiAnalysis.split('\n').map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    // Headers con **
                    if (line.includes('**') && (line.includes('📊') || line.includes('✅') || line.includes('⚠️') || line.includes('💡') || line.includes('🎯'))) {
                      const clean = line.replace(/\*\*/g, '');
                      return <h4 key={i} className="text-base font-bold text-slate-800 mt-4 mb-2">{clean}</h4>;
                    }
                    // Bullets
                    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                      return <p key={i} className="text-sm text-slate-700 ml-4 mb-1">{line}</p>;
                    }
                    return <p key={i} className="text-sm text-slate-700 mb-1">{line}</p>;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer del reporte */}
          <div className="text-center text-xs text-gray-400 py-4 print-footer">
            Reporte generado por AgendaPro · NEXOVA Software Empresarial · nexova.pe
          </div>
        </div>

        {/* Estilos de impresión */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            .btn-primary, .btn-secondary, button { display: none !important; }
            .card { border: 1px solid #E2E8F0 !important; break-inside: avoid; }
            nav, aside, header { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}

function ReportKPI({ label, value, icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-xl font-bold text-slate-800 font-sora">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBox({ label, value, color }) {
  return (
    <div className={'rounded-xl p-3 text-center ' + color.split(' ')[0]}>
      <div className={'text-lg font-bold font-sora ' + color.split(' ')[1]}>{value}</div>
      <div className="text-[9px] text-gray-500 font-semibold uppercase">{label}</div>
    </div>
  );
}
