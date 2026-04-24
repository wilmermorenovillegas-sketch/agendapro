import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminLayout from './components/common/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import BusinessSettingsPage from './pages/admin/BusinessSettingsPage';
import LocationsPage from './pages/admin/LocationsPage';
import ProfessionalsPage from './pages/admin/ProfessionalsPage';
import ServicesPage from './pages/admin/ServicesPage';
import ClientsPage from './pages/admin/ClientsPage';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import PerformancePage from './pages/admin/PerformancePage';
import ReportsPage from './pages/admin/ReportsPage';
import ChatPage from './pages/admin/ChatPage';
import UsersPage from './pages/admin/UsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="business" element={<BusinessSettingsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="professionals" element={<ProfessionalsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
