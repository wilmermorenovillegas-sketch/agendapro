// ═══════════════════════════════════════════════════════════════
// src/services/chatService.js
// Chat Inteligente con IA
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const chatService = {
  getContext: async () => {
    const { data, error } = await supabase.rpc('get_chat_context');
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  getHistory: async (sessionId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  saveMessage: async (sessionId, role, content) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    await supabase.from('chat_messages').insert({
      tenant_id: tenantId,
      session_id: sessionId,
      role,
      content,
    });
  },

  sendMessage: async (userMessage, context, history) => {
    const systemPrompt = `Eres el asistente virtual de "${context.business?.business_name || 'nuestro negocio'}".
Tu trabajo es responder consultas sobre servicios, precios, disponibilidad y horarios.
Responde SIEMPRE en español, de forma amigable y profesional. Sé breve y directo.

INFORMACIÓN DEL NEGOCIO:
${JSON.stringify(context.business || {}, null, 2)}

SERVICIOS DISPONIBLES:
${JSON.stringify(context.services || [], null, 2)}

SEDES:
${JSON.stringify(context.locations || [], null, 2)}

PROFESIONALES:
${JSON.stringify(context.professionals || [], null, 2)}

REGLAS:
- Si preguntan por un servicio que no existe, sugiere los disponibles
- Si preguntan por precios, da el precio exacto en Soles
- Si preguntan algo que no sabes, di amablemente que no tienes esa información y sugiere contactar directamente
- No inventes información que no esté en los datos proporcionados
- Si el cliente quiere agendar una cita, indícale que puede hacerlo llamando o por WhatsApp`;

    const messages = [
      ...(history || []).slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) throw new Error('Error en API');

      const result = await response.json();
      return result.content?.map(c => c.text || '').join('\n') || 'Lo siento, no pude procesar tu consulta.';
    } catch (err) {
      // Fallback sin IA
      return generateFallbackResponse(userMessage, context);
    }
  },
};

function generateFallbackResponse(msg, ctx) {
  const lower = msg.toLowerCase();
  const services = ctx.services || [];
  const business = ctx.business || {};

  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuánto')) {
    if (services.length === 0) return 'Aún no tenemos servicios registrados. Contáctenos para más información.';
    return `Nuestros servicios y precios:\n\n${services.map(s => `• ${s.name}: S/ ${Number(s.price).toFixed(2)} (${s.duration_minutes} min)`).join('\n')}\n\n¿Le interesa alguno?`;
  }
  if (lower.includes('servicio') || lower.includes('ofrecen') || lower.includes('hacen')) {
    if (services.length === 0) return 'Contáctenos directamente para conocer nuestros servicios.';
    return `Ofrecemos los siguientes servicios:\n\n${services.map(s => `• ${s.name} — ${s.duration_minutes} min — S/ ${Number(s.price).toFixed(2)}`).join('\n')}`;
  }
  if (lower.includes('horario') || lower.includes('hora') || lower.includes('abierto')) {
    return `Para conocer horarios disponibles, contáctenos:\n📞 ${business.phone || 'Sin teléfono registrado'}\n📧 ${business.email || 'Sin email registrado'}`;
  }
  if (lower.includes('dirección') || lower.includes('ubicación') || lower.includes('dónde')) {
    const locs = ctx.locations || [];
    if (locs.length === 0) return 'Contáctenos para conocer nuestra ubicación.';
    return `Nos encontramos en:\n\n${locs.map(l => `📍 ${l.name}: ${l.address || 'Sin dirección'}`).join('\n')}`;
  }
  if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    return `¡Hola! Bienvenido a ${business.business_name || 'nuestro negocio'}. ¿En qué puedo ayudarle?\n\nPuedo informarle sobre:\n• Servicios y precios\n• Horarios disponibles\n• Ubicación`;
  }
  return `Gracias por su consulta. Para una atención personalizada, contáctenos:\n📞 ${business.phone || ''}\n📧 ${business.email || ''}\n\n¿Puedo ayudarle con algo más?`;
}

export default chatService;
