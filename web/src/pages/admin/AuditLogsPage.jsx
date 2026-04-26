// pages/admin/AuditLogsPage.jsx
// Página para consultar logs de auditoría del sistema

import { useState, useEffect } from 'react';
import { getAuditLogs } from '../../services/auditService';
import { FileText, Filter, Calendar, User, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tableName: '',
    startDate: '',
    endDate: '',
    limit: 100
  });
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        tableName: filters.tableName || null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        limit: filters.limit
      });
      setLogs(data);
    } catch (error) {
      toast.error('Error al cargar logs de auditoría');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadLogs();
  };

  const getActionBadge = (action) => {
    const badges = {
      INSERT: { bg: 'bg-green-100', text: 'text-green-800', label: 'CREAR' },
      UPDATE: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'EDITAR' },
      DELETE: { bg: 'bg-red-100', text: 'text-red-800', label: 'ELIMINAR' }
    };

    const badge = badges[action] || badges.INSERT;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTableDisplayName = (tableName) => {
    const names = {
      services: 'Servicios',
      appointments: 'Citas',
      clients: 'Clientes',
      professionals: 'Profesionales',
      locations: 'Sedes',
      profiles: 'Perfiles',
      user_roles: 'Roles de Usuario'
    };
    return names[tableName] || tableName;
  };

  const renderJsonDiff = (oldValues, newValues) => {
    if (!oldValues && !newValues) return null;

    // Para INSERT solo mostrar valores nuevos
    if (!oldValues && newValues) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Valores nuevos:</p>
          <pre className="bg-green-50 p-3 rounded text-xs text-slate-800 overflow-auto max-h-96">
            {JSON.stringify(newValues, null, 2)}
          </pre>
        </div>
      );
    }

    // Para DELETE solo mostrar valores antiguos
    if (oldValues && !newValues) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Valores eliminados:</p>
          <pre className="bg-red-50 p-3 rounded text-xs text-slate-800 overflow-auto max-h-96">
            {JSON.stringify(oldValues, null, 2)}
          </pre>
        </div>
      );
    }

    // Para UPDATE mostrar diff
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Antes:</p>
          <pre className="bg-slate-50 p-3 rounded text-xs text-slate-800 overflow-auto max-h-96">
            {JSON.stringify(oldValues, null, 2)}
          </pre>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Después:</p>
          <pre className="bg-blue-50 p-3 rounded text-xs text-slate-800 overflow-auto max-h-96">
            {JSON.stringify(newValues, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Auditoría del Sistema</h1>
        <p className="text-slate-600">
          Registro completo de cambios en el sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tabla
            </label>
            <select
              value={filters.tableName}
              onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              <option value="services">Servicios</option>
              <option value="appointments">Citas</option>
              <option value="clients">Clientes</option>
              <option value="professionals">Profesionales</option>
              <option value="locations">Sedes</option>
              <option value="profiles">Perfiles</option>
              <option value="user_roles">Roles de Usuario</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No hay logs de auditoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {getActionBadge(log.action)}
                  
                  <div>
                    <p className="font-medium text-slate-800">
                      {getTableDisplayName(log.table_name)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{log.user_email || 'Sistema'}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(log.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-slate-400">
                  {expandedLog === log.id ? '▲' : '▼'}
                </span>
              </div>

              {expandedLog === log.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="pt-4">
                    {renderJsonDiff(log.old_values, log.new_values)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
