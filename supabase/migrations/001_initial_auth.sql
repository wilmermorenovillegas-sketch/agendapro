-- ═══════════════════════════════════════════════════════════════
-- AgendaPro — Migración Inicial (Módulo 1.1 + 1.2)
-- Ejecutar en Supabase SQL Editor o como migración CLI
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. TABLAS
-- ──────────────────────────────────────────────────────────────

-- Tabla de tenants/negocios
CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de roles del sistema
CREATE TABLE public.roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  hierarchy_level INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- Tabla de perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES public.tenants(id) ON DELETE RESTRICT,
  first_name        TEXT NOT NULL DEFAULT '',
  last_name         TEXT NOT NULL DEFAULT '',
  phone_number      TEXT NOT NULL DEFAULT '',
  profile_photo_url TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID,
  is_deleted         BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMPTZ
);

-- Tabla intermedia usuario-rol (muchos a muchos)
CREATE TABLE public.user_roles (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);

-- ──────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ──────────────────────────────────────────────────────────────

CREATE INDEX idx_profiles_tenant    ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_active    ON public.profiles(is_active, is_deleted);
CREATE INDEX idx_user_roles_user    ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role    ON public.user_roles(role_id);
CREATE INDEX idx_tenants_slug       ON public.tenants(slug);

-- ──────────────────────────────────────────────────────────────
-- 3. SEEDS: Roles del sistema
-- ──────────────────────────────────────────────────────────────

INSERT INTO public.roles (id, name, description, hierarchy_level) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SuperAdmin', 'Administrador de la plataforma AgendaPro', 0),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Admin',      'Dueño/administrador de un negocio',        1),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Professional','Profesional/asesor que atiende citas',     2),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Client',     'Cliente final que agenda citas',            3);

-- ──────────────────────────────────────────────────────────────
-- 4. FUNCIONES AUXILIARES
-- ──────────────────────────────────────────────────────────────

-- Obtener tenant_id del usuario actual desde app_metadata del JWT
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$;

-- Obtener rol del usuario actual desde app_metadata del JWT
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'user_role';
$$;

-- Verificar si el usuario actual es SuperAdmin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role() = 'SuperAdmin';
$$;

-- Verificar si el usuario actual es Admin o superior
CREATE OR REPLACE FUNCTION public.is_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role() IN ('SuperAdmin', 'Admin');
$$;

-- Generar slug URL-friendly a partir de un nombre de negocio
CREATE OR REPLACE FUNCTION public.generate_slug(business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  suffix TEXT;
BEGIN
  -- Convertir a minúsculas y reemplazar caracteres especiales
  base_slug := lower(business_name);
  base_slug := replace(base_slug, 'á', 'a');
  base_slug := replace(base_slug, 'é', 'e');
  base_slug := replace(base_slug, 'í', 'i');
  base_slug := replace(base_slug, 'ó', 'o');
  base_slug := replace(base_slug, 'ú', 'u');
  base_slug := replace(base_slug, 'ñ', 'n');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(BOTH '-' FROM base_slug);

  -- Agregar sufijo aleatorio para unicidad
  suffix := substr(gen_random_uuid()::text, 1, 6);
  final_slug := base_slug || '-' || suffix;

  RETURN final_slug;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGER: Crear perfil automáticamente al registrarse
-- ──────────────────────────────────────────────────────────────

-- Esta función se ejecuta cuando un usuario se registra en Supabase Auth.
-- Lee los metadata enviados desde el frontend y crea el perfil + asigna rol.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name  TEXT;
  v_role_id    UUID;
  v_tenant_id  UUID;
  v_biz_name   TEXT;
BEGIN
  -- Leer datos del registro (enviados desde el frontend como user_metadata)
  v_role_name := COALESCE(NEW.raw_user_meta_data ->> 'role', 'Client');
  v_biz_name  := NEW.raw_user_meta_data ->> 'business_name';

  -- Obtener el ID del rol
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = v_role_name AND is_active = true;

  -- Si el rol no existe, usar Client por defecto
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE name = 'Client' AND is_active = true;
    v_role_name := 'Client';
  END IF;

  -- Si es Admin, crear un nuevo tenant
  IF v_role_name = 'Admin' AND v_biz_name IS NOT NULL AND v_biz_name != '' THEN
    INSERT INTO public.tenants (business_name, slug)
    VALUES (v_biz_name, public.generate_slug(v_biz_name))
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Si es Client, leer tenant_id del metadata
  IF v_role_name = 'Client' THEN
    v_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  END IF;

  -- Crear perfil
  INSERT INTO public.profiles (id, tenant_id, first_name, last_name, phone_number)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')
  );

  -- Asignar rol
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, v_role_id);

  -- Guardar tenant_id y role en app_metadata del JWT (para RLS)
  -- app_metadata NO puede ser modificado por el usuario (seguro para auth)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('tenant_id', v_tenant_id)
    || jsonb_build_object('user_role', v_role_name)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger que ejecuta la función al crear un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 6. TRIGGER: Actualizar updated_at automáticamente
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles      ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──

-- Cualquier usuario autenticado puede ver su propio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin puede ver todos los perfiles de su tenant
CREATE POLICY "profiles_select_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_admin_or_higher()
  );

-- SuperAdmin puede ver todos los perfiles
CREATE POLICY "profiles_select_superadmin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin puede actualizar perfiles de su tenant
CREATE POLICY "profiles_update_tenant" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_admin_or_higher()
  );

-- El trigger handle_new_user usa SECURITY DEFINER, por eso puede insertar
-- sin necesidad de una política INSERT para el usuario final

-- ── TENANTS ──

-- Usuarios autenticados pueden ver su propio tenant
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_my_tenant_id());

-- SuperAdmin puede ver todos los tenants
CREATE POLICY "tenants_select_superadmin" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Admin puede actualizar su propio tenant
CREATE POLICY "tenants_update_own" ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    id = public.get_my_tenant_id()
    AND public.is_admin_or_higher()
  );

-- Permitir lectura pública de tenants activos (para registro de clientes)
CREATE POLICY "tenants_select_public" ON public.tenants
  FOR SELECT TO anon
  USING (is_active = true);

-- ── ROLES ──

-- Todos pueden leer los roles (necesario para UI)
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT TO authenticated, anon
  USING (true);

-- ── USER_ROLES ──

-- Usuario puede ver sus propios roles
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin puede ver roles de su tenant
CREATE POLICY "user_roles_select_tenant" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_higher()
    AND user_id IN (
      SELECT id FROM public.profiles WHERE tenant_id = public.get_my_tenant_id()
    )
  );

-- Admin puede asignar roles dentro de su tenant
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_higher()
    AND user_id IN (
      SELECT id FROM public.profiles WHERE tenant_id = public.get_my_tenant_id()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 8. VISTAS DE CONVENIENCIA
-- ──────────────────────────────────────────────────────────────

-- Vista que combina perfil + email + roles para consultas frecuentes
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  p.id,
  p.tenant_id,
  t.business_name AS tenant_name,
  p.first_name,
  p.last_name,
  p.first_name || ' ' || p.last_name AS full_name,
  u.email,
  p.phone_number,
  p.profile_photo_url,
  p.is_active,
  p.last_login_at,
  p.created_at,
  COALESCE(
    (SELECT array_agg(r.name)
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE ur.user_id = p.id),
    ARRAY[]::TEXT[]
  ) AS roles
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.tenants t ON t.id = p.tenant_id
WHERE p.is_deleted = false;
