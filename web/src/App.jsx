// ═══════════════════════════════════════════════════════════════
// src/App.jsx — Módulo 1.2 + 1.3
// ═══════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminLayout from './components/common/AdminLayout';
import BusinessSettingsPage from './pages/admin/BusinessSettingsPage';
import LocationsPage from './pages/admin/LocationsPage';
import ProfessionalsPage from './pages/admin/ProfessionalsPage';
import ServicesPage from './pages/admin/ServicesPage';
import ClientsPage from './pages/admin/ClientsPage';
import AppointmentsPage from './pages/admin/AppointmentsPage';

// Dashboard temporal
function TempDashboard() {
  const { profile } = useAuth();

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 font-sora mb-2">
          ¡Hola, {profile?.first_name}!
        </h1>
        <p className="text-gray-400 mb-6">Bienvenido al panel de {profile?.tenant_name}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <p className="text-sm text-gray-400">Citas Hoy</p>
            <p className="text-3xl font-bold text-slate-800 font-sora mt-1">0</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-400">Clientes</p>
            <p className="text-3xl font-bold text-slate-800 font-sora mt-1">0</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-400">Profesionales</p>
            <p className="text-3xl font-bold text-slate-800 font-sora mt-1">0</p>
          </div>
        </div>

        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <p className="text-teal-700 text-sm">
            <span className="font-bold">Módulo 1.3 — Gestión de Negocio</span> disponible.
            <br />
            <span className="text-teal-600">
              Vaya a <strong>Mi Negocio</strong> en el menú lateral para configurar su empresa.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Panel Admin con layout sidebar */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TempDashboard />} />
            <Route path="business" element={<BusinessSettingsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="professionals" element={<ProfessionalsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
          </Route>

          {/* Redirecciones */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
