# AgendaPro - Contexto del Proyecto

> Memoria persistente para Claude Code. Léeme primero al iniciar cada sesión.

---

## Quién soy yo (Wilmer)

- Dueño de **NEXOVA Software Empresarial**, Lima, Perú
- **NO soy programador de formación**
- Desarrollo todo con asistencia de Claude
- Email: wilmermor07@gmail.com
- Hablo siempre en **español**

---

## Qué es AgendaPro

- **SaaS multi-tenant** de gestión de citas
- **Mercado**: barberías, clínicas dentales, centros estéticos en Lima y Latam
- **Modelo de negocio**: USD 100/mes por tenant, plan único, pagos solo Yape/Plin (sin tarjetas)
- **Producción**: https://agendapro-kappa.vercel.app

---

## Stack técnico

- **Frontend**: React 18 + Vite 6 + Tailwind CSS 3, desplegado en Vercel
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage + RPC + Edge Functions)
- **Supabase Project ID**: `acpmwvhttzteobvmkrca`
- **Repo**: github.com/wilmermorenovillegas-sketch/agendapro
- **Rama de producción**: `main`
- **Node**: 20.x (definido en `web/.nvmrc` y `web/package.json` engines)

### Dependencias clave (web/package.json)

- `@supabase/supabase-js@^2.47.10` - cliente Supabase
- `react@^18.3.1` + `react-dom@^18.3.1`
- `react-router-dom@^6.28.0` - routing
- `lucide-react@^0.263.1` - iconos
- `react-hot-toast@^2.4.1` - notificaciones (Toaster montado en App.jsx)

---

## Identidad de marca NEXOVA

| Token | Valor |
|---|---|
| Color primario | Teal `#0F766E` |
| Color de acento | Teal claro `#0D9488` |
| Color oscuro | Slate `#1E293B` |
| Fondo | Pearl `#F4F6F8` |
| Tipografía display (títulos, botones, logo) | **Sora** |
| Tipografía cuerpo | **DM Sans** |

---

## Datos de prueba

- **Tenant principal LURIN ID**: `51051b03-b7ae-4eba-ac9e-1a8fe7f6376a`
- **Admin demo**: wilmermor07@gmail.com / `Donato12@`
- **Profesional demo**: wilmer.moreno2026@outlook.com / `Donato12@`

---

## Estructura del repo (auto-detectada)

### Raíz del proyecto

```
agendapro/
├── CLAUDE.md                  ← este archivo (memoria de Claude)
├── README.md                  ← README desactualizado (solo menciona Phase 1.2)
├── vercel.json                ← config de despliegue raíz
├── .env                       ← credenciales (NO subir)
├── supabase/                  ← backend
└── web/                       ← frontend React
```

### Backend Supabase (`supabase/`)

- `config.toml` — config Supabase CLI
- `migrations/`
  - `001_initial_auth.sql` — tablas iniciales, RLS, triggers, seeds, auth
  - `002_tenant_management.sql` — gestión de tenants
- `functions/`
  - `_shared/cors.ts` — helper CORS para Edge Functions
  - `_shared/supabase-client.ts` — cliente compartido
  - `validate-appointment/index.ts` — Edge Function de validación de citas (única existente)

### Frontend (`web/src/`)

**Entrada y routing**

- `main.jsx` — bootstrap React
- `App.jsx` — define rutas (versión `RECOVERY-26-04-2026`)
- `lib/supabase.js` — **cliente Supabase oficial**
- `config/supabaseClient.js` — re-export del anterior (NO crear instancias nuevas)

**Auth y permisos**

- `context/AuthContext.jsx` — estado global (versión `LOGIN-FIX-V3`)
- `hooks/useAuth.js`
- `hooks/usePermissions.js`
- `components/auth/ProtectedRoute.jsx` — guard usado por App.jsx (V2, patrón children)
- `components/ProtectedRoute.jsx` — versión vieja (no usada)

**Layouts**

- `components/common/AdminLayout.jsx` — layout activo del panel admin (sidebar + 15 módulos)
- `components/DashboardLayout.jsx` — placeholder antiguo (no usado)
- `components/InvitationsTab.jsx`

**Páginas administrativas (`pages/admin/`) — 15 módulos activos**

| Ruta | Archivo | Solo Admin |
|---|---|---|
| `/admin/dashboard` | `DashboardPage.jsx` | No |
| `/admin/business` | `BusinessSettingsPage.jsx` | Sí |
| `/admin/locations` | `LocationsPage.jsx` | Sí |
| `/admin/professionals` | `ProfessionalsPage.jsx` | Sí |
| `/admin/services` | `ServicesPage.jsx` | No |
| `/admin/clients` | `ClientsPage.jsx` | No |
| `/admin/appointments` | `AppointmentsPage.jsx` | No |
| `/admin/users` | `UsersPage.jsx` | Sí |
| `/admin/permissions` | `PermissionsPage.jsx` | Sí |
| `/admin/performance` | `PerformancePage.jsx` | No |
| `/admin/reports` | `ReportsPage.jsx` | Sí |
| `/admin/chat` | `ChatPage.jsx` | No |
| `/admin/audit-logs` | `AuditLogsPage.jsx` | Sí |
| `/admin/trash` | `TrashPage.jsx` | Sí |
| `/admin/limits` | `TenantLimitsPage.jsx` | Sí |

**Páginas públicas / auth**

- `pages/auth/LoginPage.jsx` — login activo (V3)
- `pages/auth/RegisterPage.jsx`
- `pages/AcceptInvitePage.jsx` — `/accept-invite/:token`

**Páginas duplicadas/legacy en `pages/` (NO usadas por App.jsx)**

- `pages/AppointmentsPage.jsx`
- `pages/ClientsPage.jsx`
- `pages/DashboardPage.jsx`
- `pages/LoginPage.jsx`
- `pages/ServicesPage.jsx`

**Servicios (`services/`) — 18 archivos**

- `aiService.js` — IA / reportes
- `appointmentService.js` — citas
- `auditService.js` — audit logs (Phase 1.6)
- `chatService.js` — mensajería
- `clientService.js` — clientes
- `dashboardService.js` — métricas dashboard
- `invitationsService.js` — invitaciones (Phase 1.6)
- `locationService.js` — sedes
- `notificationService.js` — notificaciones
- `paymentService.js` — pagos (Yape/Plin)
- `performanceService.js` — rendimiento
- `permissionsService.js` — permisos (Phase 1.6)
- `professionalService.js` — profesionales
- `serviceService.js` — servicios del negocio
- `softDeleteService.js` — papelera (Phase 1.6)
- `tenantLimitsService.js` — límites de tenant (Phase 1.6)
- `tenantService.js` — gestión de tenants
- `userService.js` — usuarios

**Estilos**

- `styles/index.css` — Tailwind base

---

## Estado actual del proyecto

- **Phase 1.6 BACKEND**: completo en Supabase (audit logs, soft delete, tenant limits, invitations, permissions)
- **Phase 2 FRONTEND**: módulos admin funcionando (Dashboard, Clientes, Servicios, Citas, Profesionales, Sedes, Usuarios, Permisos, Rendimiento, Reportes, Chat, Mi Negocio, Auditoría, Papelera, Límites)
- **PRÓXIMO**: Phase 2.4 — página pública de reserva de citas (lo que falta para tener MVP vendible)

---

## Reglas ABSOLUTAS para trabajar conmigo (Wilmer)

1. Responde **SIEMPRE en español**
2. **Comentarios** del código en español, **nombres de variables/funciones en inglés**
3. Usa **Clean Architecture** y código **listo para producción**, no prototipos
4. Antes de crear módulos nuevos, **propón estructura de archivos y entidades, y espera mi confirmación**
5. Si tienes que decidir entre varias opciones técnicas, dame **pros/contras y recomendación clara**
6. Considera siempre **costos de hosting** (Vercel free + Supabase free), viabilidad comercial y escalabilidad
7. Idioma de la app: **español (Perú)**. Zona horaria: **America/Lima**. Moneda: **PEN** (soles) para precios al cliente, **USD** para mi suscripción.
8. **Formato fecha**: `dd/MM/yyyy`. **Hora**: 12h con AM/PM en UI, 24h en BD.
9. **NO ejecutes `git push` automáticamente sin avisarme**. Yo decido cuándo subimos cambios.
10. Cuando termines un módulo, dame un **resumen de qué archivos creaste/modificaste y qué falta probar**.

---

## Aprendizajes técnicos importantes (no repetir errores pasados)

- **Supabase SQL editor** corre como rol `postgres`, así que `auth.jwt()` devuelve NULL al probar manualmente. Es esperado.
- Funciones RPC que tocan `auth.users` **DEBEN ser `SECURITY DEFINER`**.
- Después de crear/modificar funciones RPC: ejecutar `NOTIFY pgrst, 'reload schema';`
- Las llamadas **RPC pueden devolver JSON como string**. Patrón defensivo:
  ```js
  typeof data === 'string' ? JSON.parse(data) : data
  ```
- `new Date("YYYY-MM-DD")` en JS lo parsea como **UTC midnight** → bug de off-by-one. Usar `new Date(year, month-1, day, 0,0,0,0)` para fechas locales.
- Hay **DOS clientes Supabase** en el proyecto (`web/src/lib/supabase.js` y `web/src/config/supabaseClient.js`). El segundo solo re-exporta del primero, **NO crear instancias nuevas**.

---

## Comandos útiles del repo

```bash
# Frontend dev local
cd web && npm run dev          # http://localhost:5173

# Frontend build
cd web && npm run build

# Preview del build
cd web && npm run preview
```

- **Vercel** hace deploy automático al hacer push a `main`.

---

## Inconsistencias / pendientes detectados al explorar

1. **README.md desactualizado**: dice que solo están completos los Módulos 1.1 y 1.2, pero el código tiene Phase 1.6 + Phase 2 con 15 módulos funcionando. Conviene actualizarlo.
2. **Archivos legacy duplicados** en `web/src/pages/` (no en `/admin/`): `AppointmentsPage`, `ClientsPage`, `DashboardPage`, `LoginPage`, `ServicesPage`. App.jsx ya no los importa — candidatos a borrar.
3. **`web/src/components/ProtectedRoute.jsx`** (versión vieja) coexiste con la V2 en `components/auth/`. Solo se usa la V2.
4. **`web/src/components/DashboardLayout.jsx`** placeholder, ya no se usa (App usa `AdminLayout`).
5. **`web/src/userService.js`** (archivo suelto fuera de `/services/`) — parece huérfano, revisar si se puede eliminar.
6. **README menciona solo 1 migración SQL** (`001_initial_auth.sql`), pero existe también `002_tenant_management.sql`.
7. **Solo 1 Edge Function** existe (`validate-appointment`). Si los servicios de IA, pagos, notificaciones requieren lógica server-side, faltarían más.
