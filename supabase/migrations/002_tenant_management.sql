-- ═══════════════════════════════════════════════════════════════
-- AgendaPro — Migración Módulo 1.3: Gestión de Tenant/Negocio
-- NOTA: Esta migración YA fue ejecutada en Supabase.
-- Este archivo es solo referencia/documentación.
-- ═══════════════════════════════════════════════════════════════

-- Columnas nuevas en tenants
ALTER TABLE public.tenants
  ADD COLUMN owner_id         UUID REFERENCES auth.users(id),
  ADD COLUMN email            TEXT DEFAULT '',
  ADD COLUMN phone            TEXT DEFAULT '',
  ADD COLUMN address          TEXT DEFAULT '',
  ADD COLUMN city             TEXT DEFAULT 'Lima',
  ADD COLUMN district         TEXT DEFAULT '',
  ADD COLUMN country          TEXT DEFAULT 'Perú',
  ADD COLUMN logo_url         TEXT,
  ADD COLUMN description      TEXT DEFAULT '',
  ADD COLUMN category         TEXT DEFAULT 'General',
  ADD COLUMN currency         TEXT DEFAULT 'PEN',
  ADD COLUMN timezone         TEXT DEFAULT 'America/Lima',
  ADD COLUMN primary_color    TEXT DEFAULT '#0F766E',
  ADD COLUMN secondary_color  TEXT DEFAULT '#1E293B',
  ADD COLUMN business_hours   JSONB DEFAULT '{"monday":{"open":"09:00","close":"18:00","enabled":true},"tuesday":{"open":"09:00","close":"18:00","enabled":true},"wednesday":{"open":"09:00","close":"18:00","enabled":true},"thursday":{"open":"09:00","close":"18:00","enabled":true},"friday":{"open":"09:00","close":"18:00","enabled":true},"saturday":{"open":"09:00","close":"13:00","enabled":true},"sunday":{"open":"00:00","close":"00:00","enabled":false}}'::jsonb,
  ADD COLUMN appointment_buffer_minutes INT DEFAULT 15,
  ADD COLUMN max_advance_booking_days   INT DEFAULT 30,
  ADD COLUMN cancellation_policy_hours  INT DEFAULT 24,
  ADD COLUMN welcome_message TEXT DEFAULT '¡Bienvenido! Agende su cita en línea.';

-- Tabla de categorías
CREATE TABLE public.business_categories (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL DEFAULT '🏢'
);

INSERT INTO public.business_categories (id, name, icon) VALUES
  ('health','Salud y Medicina','🏥'), ('beauty','Belleza y Estética','💇'),
  ('dental','Odontología','🦷'), ('legal','Servicios Legales','⚖️'),
  ('consulting','Consultoría','💼'), ('education','Educación','📚'),
  ('fitness','Fitness y Deporte','🏋️'), ('therapy','Terapia y Bienestar','🧘'),
  ('veterinary','Veterinaria','🐾'), ('automotive','Automotriz','🚗'),
  ('real_estate','Inmobiliaria','🏠'), ('accounting','Contabilidad','📊'),
  ('photography','Fotografía','📸'), ('general','General / Otros','🏢');

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_all" ON public.business_categories
  FOR SELECT TO authenticated, anon USING (true);

-- Storage bucket para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-assets', 'tenant-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']);
