# AgendaPro — Sistema de Gestión de Citas

> Desarrollado por **NEXOVA** · Software Empresarial · Lima, Perú
> Backend 100% en **Supabase** · Frontend en **React 18**

## Estructura del Proyecto

```
D:\PROYECTOS\AgendaPro\
│
├── supabase/                          ← Backend completo
│   ├── config.toml                    ← Configuración Supabase CLI
│   ├── migrations/
│   │   └── 001_initial_auth.sql       ← Tablas, RLS, triggers, seeds
│   └── functions/
│       ├── _shared/                   ← Helpers compartidos
│       │   ├── cors.ts
│       │   └── supabase-client.ts
│       └── validate-appointment/      ← Edge Function de ejemplo
│           └── index.ts
│
└── web/                               ← Frontend React 18
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── .env                           ← Credenciales Supabase
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── lib/supabase.js            ← Cliente Supabase
        ├── context/AuthContext.jsx     ← Estado global de auth
        ├── hooks/useAuth.js
        ├── components/auth/
        │   └── ProtectedRoute.jsx
        ├── pages/auth/
        │   ├── LoginPage.jsx
        │   └── RegisterPage.jsx
        └── styles/index.css
```

## Módulos Completados

- [x] **Módulo 1.1** — Setup del proyecto (Supabase + React scaffold)
- [x] **Módulo 1.2** — Autenticación y Roles (Supabase Auth + RLS + RBAC)
- [ ] Módulo 1.3 — Gestión de Tenant/Negocio
- [ ] Módulo 1.4 — Gestión de Sedes/Locales

## Configuración Paso a Paso

### 1. Crear proyecto en Supabase

1. Ir a [database.new](https://database.new)
2. Crear cuenta / iniciar sesión
3. Click en **New Project**
4. Elegir nombre: `agendapro`
5. Elegir región: **South America (São Paulo)** (más cercano a Lima)
6. Generar y guardar la contraseña de la base de datos
7. Click **Create new project**

### 2. Ejecutar la migración SQL

1. En el dashboard de Supabase, ir a **SQL Editor**
2. Click en **New query**
3. Copiar TODO el contenido de `supabase/migrations/001_initial_auth.sql`
4. Click en **Run** (ejecutar)
5. Verificar que no hay errores

### 3. Obtener credenciales

1. Ir a **Settings → API**
2. Copiar:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 4. Configurar el frontend

```bash
cd web
npm install

# Editar .env con tus credenciales
# VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGci...

npm run dev
```

App disponible en: http://localhost:5173

## Stack Tecnológico

| Capa | Antes (.NET) | Ahora (Supabase) |
|------|-------------|-------------------|
| Base de datos | EF Core + Azure PostgreSQL | **Supabase Database** (PostgreSQL) |
| Autenticación | JWT custom + BCrypt | **Supabase Auth** (automático) |
| Autorización | Middleware + Policies | **Row Level Security** (RLS) |
| API REST | ASP.NET Core Controllers | **Supabase auto-generated API** |
| Lógica compleja | C# Services | **Edge Functions** (TypeScript) |
| Archivos | Azure Blob Storage | **Supabase Storage** |
| Realtime | Azure SignalR | **Supabase Realtime** |
| Costo mensual | ~$80-100 (Azure) | **$0** (tier gratuito) |

## Cómo funciona el Auth

1. **Registro**: React llama `supabase.auth.signUp()` con metadata (nombre, rol, negocio)
2. **Trigger SQL**: `handle_new_user()` se ejecuta automáticamente y:
   - Crea el perfil en `public.profiles`
   - Si es Admin → crea tenant en `public.tenants`
   - Asigna rol en `public.user_roles`
   - Guarda `tenant_id` y `user_role` en `app_metadata` del JWT
3. **RLS**: Cada query a la BD se filtra automáticamente por `tenant_id` del JWT
4. **Refresh tokens**: Supabase los maneja automáticamente (sin código)

## Contacto

**NEXOVA** · Jr. Álava 268, San Luis, Lima
+51 949 287 897 · info@nexova.pe · [nexova.pe](https://nexova.pe)

<!-- trigger redeploy -->

"trigger redeploy"
