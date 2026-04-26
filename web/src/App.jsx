import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ServicesPage from './pages/ServicesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import UsersPage from './pages/admin/UsersPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import TrashPage from './pages/admin/TrashPage';
import TenantLimitsPage from './pages/admin/TenantLimitsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
          
          {/* RUTAS PROTEGIDAS */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="limits" element={<TenantLimitsPage />} />
            </Route>
          </Route>

          {/* RUTA POR DEFECTO */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
