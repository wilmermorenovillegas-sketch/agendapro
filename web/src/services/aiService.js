// ═══════════════════════════════════════════════════════════════
// src/services/aiService.js
// Análisis IA del dashboard usando Claude API via Supabase
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const aiService = {
  getAnalysisData: async () => {
    const { data, error } = await supabase.rpc('get_ai_analysis_data');
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  // Genera el análisis usando la API de Anthropic directamente desde el frontend
  generateAnalysis: async (businessData) => {
    const prompt = `Eres un consultor de negocios experto en empresas de servicios en Lima, Perú.
Analiza los siguientes datos del negocio "${businessData.business?.business_name || 'sin nombre'}" (categoría: ${businessData.business?.category || 'general'}) y genera un análisis ejecutivo en español.

DATOS ÚLTIMOS 30 DÍAS:
- Total citas: ${businessData.last_30_days?.total || 0}
- Completadas: ${businessData.last_30_days?.completed || 0}
- Canceladas: ${businessData.last_30_days?.cancelled || 0}
- No asistieron: ${businessData.last_30_days?.no_show || 0}
- Ingresos: S/ ${businessData.last_30_days?.revenue || 0}
- Clientes únicos: ${businessData.last_30_days?.unique_clients || 0}

DATOS ÚLTIMOS 7 DÍAS:
- Total citas: ${businessData.last_7_days?.total || 0}
- Completadas: ${businessData.last_7_days?.completed || 0}
- Ingresos: S/ ${businessData.last_7_days?.revenue || 0}

TOP SERVICIOS: ${JSON.stringify(businessData.top_services || [])}
HORARIOS MÁS DEMANDADOS: ${JSON.stringify(businessData.hourly_distribution || [])}
DÍAS MÁS ACTIVOS: ${JSON.stringify(businessData.weekday_distribution || [])}

Genera un análisis con estas secciones (usa emojis para hacerlo visual):
1. 📊 RESUMEN EJECUTIVO (2-3 oraciones)
2. ✅ FORTALEZAS (3 puntos positivos)
3. ⚠️ OPORTUNIDADES DE MEJORA (3 recomendaciones concretas y accionables)
4. 💡 RECOMENDACIONES DE HORARIOS (basado en los datos de demanda)
5. 🎯 META PARA EL PRÓXIMO MES (1 meta específica y medible)

Sé directo, práctico y usa datos específicos del negocio. Responde en español.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la API de IA');
      }

      const result = await response.json();
      const text = result.content?.map(c => c.text || '').join('\n') || 'No se pudo generar análisis';
      return text;
    } catch (err) {
      // Fallback: generar análisis básico sin IA
      return generateFallbackAnalysis(businessData);
    }
  },
};

// Análisis básico sin IA (fallback)
function generateFallbackAnalysis(data) {
  const d = data.last_30_days || {};
  const total = d.total || 0;
  const completed = d.completed || 0;
  const cancelled = d.cancelled || 0;
  const noShow = d.no_show || 0;
  const revenue = Number(d.revenue || 0);
  const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  let analysis = `📊 **RESUMEN EJECUTIVO**\n`;
  analysis += `En los últimos 30 días se registraron ${total} citas con ingresos de S/ ${revenue.toFixed(0)}. `;
  analysis += `La tasa de asistencia es del ${attendanceRate}%.\n\n`;

  analysis += `✅ **FORTALEZAS**\n`;
  if (completed > 0) analysis += `• Se completaron ${completed} citas exitosamente\n`;
  if (revenue > 0) analysis += `• Ingresos generados: S/ ${revenue.toFixed(0)}\n`;
  analysis += `• El sistema de agendamiento está operativo y registrando datos\n\n`;

  analysis += `⚠️ **OPORTUNIDADES DE MEJORA**\n`;
  if (cancelRate > 20) analysis += `• Reducir cancelaciones (${cancelRate}% actual) — considere política de cancelación anticipada\n`;
  if (noShow > 0) analysis += `• Reducir no-shows (${noShow} en el período) — implemente recordatorios por WhatsApp 1 hora antes\n`;
  if (total < 20) analysis += `• Incrementar volumen de citas — considere campañas en redes sociales\n`;
  analysis += `• Diversifique servicios para atraer nuevos clientes\n\n`;

  analysis += `💡 **RECOMENDACIONES**\n`;
  const topHours = (data.hourly_distribution || []).slice(0, 3);
  if (topHours.length > 0) {
    analysis += `• Horarios más demandados: ${topHours.map(h => `${h.hour}:00`).join(', ')} — refuerce personal en estos horarios\n`;
  }
  const topDays = (data.weekday_distribution || []).slice(0, 2);
  if (topDays.length > 0) {
    analysis += `• Días más activos: ${topDays.map(d => d.day_name).join(', ')}\n`;
  }

  analysis += `\n🎯 **META PARA EL PRÓXIMO MES**\n`;
  const nextTarget = Math.max(total + 5, Math.ceil(total * 1.2));
  analysis += `• Alcanzar ${nextTarget} citas (+${nextTarget - total} vs actual) y S/ ${Math.ceil(revenue * 1.2)} en ingresos`;

  return analysis;
}

export default aiService;
