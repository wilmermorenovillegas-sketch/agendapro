// ═══════════════════════════════════════════════════════════════
// src/App.jsx
// Configuración de rutas — VERSION RECOVERY-26-04-2026
//
// Este App.jsx restaura el routing correcto:
//   - Usa AdminLayout (con los 12 módulos) en vez de DashboardLayout placeholder
//   - Apunta a las páginas reales en /pages/admin/ (no a las placeholder en /pages/)
//   - Usa el LoginPage V3 en /pages/auth/ (no el placeholder simple)
//   - Usa el ProtectedRoute V2 (en components/auth/) con patrón children
//   - Mantiene rutas de Phase 1.6: AuditLogs, Trash, Limits, AcceptInvite, Permissions
// ═══════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// ─── Layouts y guards ───────────────────────────────────────────
import AdminLayout from './components/common/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// ─── Páginas públicas (autenticación) ───────────────────────────
import LoginPage from './pages/auth/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

// ─── Páginas públicas (reserva pública) ─────────────────────────
import BookingPage from './pages/public/BookingPage';

// ─── Páginas administrativas (módulos del sistema) ──────────────
import DashboardPage         from './pages/admin/DashboardPage';
import BusinessSettingsPage  from './pages/admin/BusinessSettingsPage';
import LocationsPage         from './pages/admin/LocationsPage';
import ProfessionalsPage     from './pages/admin/ProfessionalsPage';
import ServicesPage          from './pages/admin/ServicesPage';
import ClientsPage           from './pages/admin/ClientsPage';
import AppointmentsPage      from './pages/admin/AppointmentsPage';
import UsersPage             from './pages/admin/UsersPage';
import PermissionsPage       from './pages/admin/PermissionsPage';
import PerformancePage       from './pages/admin/PerformancePage';
import ReportsPage           from './pages/admin/ReportsPage';
import ChatPage              from './pages/admin/ChatPage';

// ─── Páginas administrativas Phase 1.6 ──────────────────────────
import AuditLogsPage     from './pages/admin/AuditLogsPage';
import TrashPage         from './pages/admin/TrashPage';
import TenantLimitsPage  from './pages/admin/TenantLimitsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ════════ RUTAS PÚBLICAS ════════ */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

          {/* Reserva pública de citas (Phase 2.4) — sin auth */}
          <Route path="/book/:tenantSlug" element={<BookingPage />} />

          {/* ════════ RUTAS PROTEGIDAS (panel admin) ════════ */}
          {/*
            ProtectedRoute V2 usa el patrón children:
            envuelve al AdminLayout completo. Las rutas hijas se
            renderizan dentro del <Outlet /> del propio AdminLayout.
          */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            {/* Index → redirige a dashboard */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />

            {/* Módulos principales (Phase 2) */}
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="business"      element={<BusinessSettingsPage />} />
            <Route path="locations"     element={<LocationsPage />} />
            <Route path="professionals" element={<ProfessionalsPage />} />
            <Route path="services"      element={<ServicesPage />} />
            <Route path="clients"       element={<ClientsPage />} />
            <Route path="appointments"  element={<AppointmentsPage />} />
            <Route path="users"         element={<UsersPage />} />
            <Route path="permissions"   element={<PermissionsPage />} />
            <Route path="performance"   element={<PerformancePage />} />
            <Route path="reports"       element={<ReportsPage />} />
            <Route path="chat"          element={<ChatPage />} />

            {/* Módulos administrativos avanzados (Phase 1.6) */}
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="trash"      element={<TrashPage />} />
            <Route path="limits"     element={<TenantLimitsPage />} />
          </Route>

          {/* ════════ REDIRECCIONES POR DEFECTO ════════ */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/"          element={<Navigate to="/login" replace />} />
          <Route path="*"          element={<Navigate to="/login" replace />} />

        </Routes>

        {/* Toaster global para notificaciones (react-hot-toast) */}
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
