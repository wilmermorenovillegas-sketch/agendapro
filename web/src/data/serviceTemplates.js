// ═══════════════════════════════════════════════════════════════
// src/data/serviceTemplates.js
// Plantillas de servicios predefinidos por categoría de negocio.
//
// Cada categoría tiene entre 5 y 8 servicios sugeridos.
// El admin puede seleccionar cuáles importar durante el onboarding.
//
// Campos por servicio:
//   name             - Nombre del servicio
//   duration_minutes - Duración estándar
//   price            - Precio base en PEN
//   description      - Descripción breve (opcional)
//   color            - Color hex para identificación visual
// ═══════════════════════════════════════════════════════════════

const SERVICE_TEMPLATES = {
  beauty: [
    { name: 'Corte de cabello', duration_minutes: 45, price: 35, description: 'Corte clásico o moderno según preferencia del cliente', color: '#EC4899' },
    { name: 'Tinte completo', duration_minutes: 90, price: 80, description: 'Coloración completa con tinte profesional', color: '#8B5CF6' },
    { name: 'Manicure clásico', duration_minutes: 40, price: 25, description: 'Limado, cutícula y esmalte', color: '#F43F5E' },
    { name: 'Pedicure clásico', duration_minutes: 60, price: 35, description: 'Limpieza, exfoliación y esmalte', color: '#F97316' },
    { name: 'Cejas y pestañas', duration_minutes: 30, price: 25, description: 'Diseño de cejas y tinte de pestañas', color: '#6366F1' },
    { name: 'Planchado / Alisado', duration_minutes: 120, price: 120, description: 'Alisado profesional con keratina o planchado', color: '#0891B2' },
    { name: 'Facial hidratante', duration_minutes: 60, price: 65, description: 'Limpieza profunda e hidratación facial', color: '#10B981' },
  ],

  dental: [
    { name: 'Consulta dental', duration_minutes: 30, price: 60, description: 'Evaluación diagnóstica general', color: '#0EA5E9' },
    { name: 'Limpieza y profilaxis', duration_minutes: 60, price: 80, description: 'Detartraje y pulido dental', color: '#06B6D4' },
    { name: 'Blanqueamiento dental', duration_minutes: 90, price: 200, description: 'Blanqueamiento profesional con luz LED', color: '#F0F9FF'.replace('F0F9FF', 'FBBF24') },
    { name: 'Restauración con resina', duration_minutes: 60, price: 150, description: 'Obturación estética color diente', color: '#34D399' },
    { name: 'Extracción dental', duration_minutes: 30, price: 80, description: 'Extracción simple bajo anestesia local', color: '#F87171' },
    { name: 'Control de ortodoncia', duration_minutes: 30, price: 50, description: 'Ajuste mensual de brackets o alineadores', color: '#A78BFA' },
    { name: 'Endodoncia', duration_minutes: 90, price: 350, description: 'Tratamiento de conducto radicular', color: '#FB923C' },
  ],

  health: [
    { name: 'Consulta médica general', duration_minutes: 30, price: 80, description: 'Atención médica integral', color: '#10B981' },
    { name: 'Consulta de especialidad', duration_minutes: 45, price: 120, description: 'Atención con médico especialista', color: '#0F766E' },
    { name: 'Control y seguimiento', duration_minutes: 20, price: 60, description: 'Revisión de tratamiento en curso', color: '#0891B2' },
    { name: 'Ecografía', duration_minutes: 30, price: 80, description: 'Diagnóstico por imagen ecográfica', color: '#2563EB' },
    { name: 'Toma de análisis', duration_minutes: 20, price: 50, description: 'Extracción de muestra para análisis clínico', color: '#7C3AED' },
    { name: 'Curación / Inyectable', duration_minutes: 20, price: 40, description: 'Procedimientos ambulatorios menores', color: '#DC2626' },
  ],

  therapy: [
    { name: 'Sesión de psicología', duration_minutes: 50, price: 80, description: 'Consulta psicológica individual', color: '#8B5CF6' },
    { name: 'Masaje relajante', duration_minutes: 60, price: 70, description: 'Masaje corporal con técnica sueca relajante', color: '#06B6D4' },
    { name: 'Masaje deportivo', duration_minutes: 60, price: 80, description: 'Masaje orientado a la recuperación muscular', color: '#0F766E' },
    { name: 'Masaje descontracturante', duration_minutes: 60, price: 75, description: 'Liberación de tensiones musculares profundas', color: '#2563EB' },
    { name: 'Reflexología podal', duration_minutes: 45, price: 55, description: 'Estimulación de puntos reflejos en los pies', color: '#D97706' },
    { name: 'Yoga terapéutico', duration_minutes: 60, price: 50, description: 'Sesión individual de yoga con enfoque terapéutico', color: '#7C3AED' },
  ],

  fitness: [
    { name: 'Entrenamiento personal', duration_minutes: 60, price: 60, description: 'Sesión 1:1 con entrenador certificado', color: '#F97316' },
    { name: 'Evaluación física inicial', duration_minutes: 30, price: 40, description: 'Mediciones y diseño de plan de entrenamiento', color: '#EAB308' },
    { name: 'Clase de spinning', duration_minutes: 45, price: 35, description: 'Cycling indoor de alta intensidad', color: '#DC2626' },
    { name: 'Clase de pilates', duration_minutes: 60, price: 50, description: 'Pilates en máquina o colchoneta', color: '#0891B2' },
    { name: 'Clase de yoga', duration_minutes: 60, price: 45, description: 'Yoga para todos los niveles', color: '#10B981' },
    { name: 'Consulta nutricional', duration_minutes: 45, price: 70, description: 'Asesoría nutricional y plan alimentario', color: '#16A34A' },
  ],

  consulting: [
    { name: 'Consulta inicial', duration_minutes: 60, price: 150, description: 'Primera reunión de diagnóstico y propuesta', color: '#2563EB' },
    { name: 'Sesión de trabajo', duration_minutes: 90, price: 200, description: 'Reunión de trabajo sobre proyecto en curso', color: '#0F766E' },
    { name: 'Revisión de proyecto', duration_minutes: 60, price: 150, description: 'Evaluación y retroalimentación de avances', color: '#7C3AED' },
    { name: 'Taller de capacitación', duration_minutes: 120, price: 250, description: 'Capacitación grupal o individual', color: '#D97706' },
    { name: 'Consultoría estratégica', duration_minutes: 120, price: 300, description: 'Planificación estratégica a largo plazo', color: '#DC2626' },
  ],

  accounting: [
    { name: 'Asesoría contable', duration_minutes: 60, price: 120, description: 'Consulta y orientación contable general', color: '#0891B2' },
    { name: 'Declaración mensual', duration_minutes: 30, price: 80, description: 'Preparación y presentación de declaración mensual', color: '#2563EB' },
    { name: 'Consulta tributaria', duration_minutes: 60, price: 120, description: 'Asesoría en impuestos y obligaciones fiscales', color: '#7C3AED' },
    { name: 'Revisión de planilla', duration_minutes: 45, price: 100, description: 'Cálculo y verificación de planilla de trabajadores', color: '#16A34A' },
    { name: 'Auditoría interna', duration_minutes: 90, price: 200, description: 'Revisión y análisis de estados financieros', color: '#DC2626' },
  ],

  education: [
    { name: 'Clase particular', duration_minutes: 60, price: 50, description: 'Clase individual en el curso solicitado', color: '#2563EB' },
    { name: 'Tutoría grupal', duration_minutes: 90, price: 35, description: 'Clase grupal de reforzamiento', color: '#0891B2' },
    { name: 'Evaluación diagnóstica', duration_minutes: 45, price: 40, description: 'Prueba de nivel y plan personalizado', color: '#D97706' },
    { name: 'Taller intensivo', duration_minutes: 120, price: 80, description: 'Sesión intensiva de preparación o repaso', color: '#DC2626' },
    { name: 'Asesoría de tesis', duration_minutes: 60, price: 80, description: 'Orientación para elaboración de tesis o informe', color: '#7C3AED' },
  ],

  legal: [
    { name: 'Consulta legal', duration_minutes: 60, price: 150, description: 'Asesoría legal general y orientación', color: '#6366F1' },
    { name: 'Revisión de contrato', duration_minutes: 60, price: 150, description: 'Análisis y observaciones a contratos', color: '#2563EB' },
    { name: 'Asesoría laboral', duration_minutes: 60, price: 150, description: 'Consulta sobre derechos y obligaciones laborales', color: '#0F766E' },
    { name: 'Consulta corporativa', duration_minutes: 90, price: 250, description: 'Asesoría a empresas en temas societarios', color: '#7C3AED' },
    { name: 'Trámite notarial', duration_minutes: 30, price: 80, description: 'Orientación y apoyo en gestiones notariales', color: '#D97706' },
  ],

  veterinary: [
    { name: 'Consulta veterinaria', duration_minutes: 30, price: 70, description: 'Atención médica a mascotas', color: '#F97316' },
    { name: 'Vacunación', duration_minutes: 20, price: 30, description: 'Aplicación de vacunas según calendario', color: '#10B981' },
    { name: 'Baño y corte', duration_minutes: 60, price: 50, description: 'Baño completo con corte según raza', color: '#0891B2' },
    { name: 'Desparasitación', duration_minutes: 20, price: 25, description: 'Tratamiento antiparasitario interno y externo', color: '#16A34A' },
    { name: 'Cirugía menor', duration_minutes: 60, price: 150, description: 'Procedimientos quirúrgicos ambulatorios', color: '#DC2626' },
    { name: 'Odontología veterinaria', duration_minutes: 60, price: 80, description: 'Limpieza y tratamiento dental para mascotas', color: '#2563EB' },
  ],

  photography: [
    { name: 'Sesión de retrato', duration_minutes: 60, price: 150, description: 'Sesión fotográfica individual o de pareja', color: '#8B5CF6' },
    { name: 'Sesión familiar', duration_minutes: 90, price: 200, description: 'Sesión fotográfica para familias', color: '#F97316' },
    { name: 'Sesión infantil', duration_minutes: 60, price: 150, description: 'Fotografía especializada para niños', color: '#EC4899' },
    { name: 'Sesión de productos', duration_minutes: 60, price: 150, description: 'Fotografía comercial de productos', color: '#0F766E' },
    { name: 'Evento social', duration_minutes: 240, price: 500, description: 'Cobertura fotográfica de eventos (cumpleaños, etc.)', color: '#DC2626' },
  ],

  real_estate: [
    { name: 'Visita a propiedad', duration_minutes: 60, price: 0, description: 'Visita guiada a inmueble en venta o alquiler', color: '#0891B2' },
    { name: 'Consulta de valuación', duration_minutes: 60, price: 150, description: 'Evaluación del valor comercial del inmueble', color: '#2563EB' },
    { name: 'Asesoría legal inmobiliaria', duration_minutes: 60, price: 200, description: 'Orientación en contratos de compraventa o alquiler', color: '#7C3AED' },
    { name: 'Reunión con propietario', duration_minutes: 45, price: 0, description: 'Reunión de coordinación con propietarios', color: '#10B981' },
  ],

  automotive: [
    { name: 'Diagnóstico vehicular', duration_minutes: 30, price: 50, description: 'Diagnóstico computarizado del vehículo', color: '#F97316' },
    { name: 'Cambio de aceite', duration_minutes: 30, price: 60, description: 'Cambio de aceite y filtros', color: '#D97706' },
    { name: 'Revisión técnica', duration_minutes: 60, price: 80, description: 'Revisión integral del estado del vehículo', color: '#DC2626' },
    { name: 'Lavado premium', duration_minutes: 45, price: 40, description: 'Lavado completo exterior e interior', color: '#0891B2' },
    { name: 'Alineación y balanceo', duration_minutes: 30, price: 60, description: 'Alineación de dirección y balanceo de ruedas', color: '#16A34A' },
  ],

  general: [
    { name: 'Consulta inicial', duration_minutes: 30, price: 50, description: 'Primera reunión o consulta de evaluación', color: '#0F766E' },
    { name: 'Servicio básico', duration_minutes: 30, price: 50, description: 'Atención estándar', color: '#2563EB' },
    { name: 'Servicio premium', duration_minutes: 60, price: 100, description: 'Atención completa de alta calidad', color: '#7C3AED' },
    { name: 'Seguimiento', duration_minutes: 30, price: 40, description: 'Reunión de control y seguimiento', color: '#D97706' },
  ],
};

export default SERVICE_TEMPLATES;
