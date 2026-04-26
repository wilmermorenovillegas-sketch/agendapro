// pages/admin/TrashPage.jsx
// Página de papelera para recuperar registros eliminados (soft delete)

import { useState, useEffect } from 'react';
import { getDeletedRecords, restoreDeletedRecord } from '../../services/softDeleteService';
import { Trash2, RotateCcw, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TrashPage() {
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState('services');
  const [daysAgo, setDaysAgo] = useState(30);

  const tables = [
    { value: 'services', label: 'Servicios' },
    { value: 'appointments', label: 'Citas' },
    { value: 'clients', label: 'Clientes' },
    { value: 'professionals', label: 'Profesionales' },
    { value: 'locations', label: 'Sedes' }
  ];

  useEffect(() => {
    loadDeletedRecords();
  }, [selectedTable, daysAgo]);

  const loadDeletedRecords = async () => {
    setLoading(true);
    try {
      const data = await getDeletedRecords(selectedTable, daysAgo);
      setDeletedRecords(data);
    } catch (error) {
      toast.error('Error al cargar registros eliminados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (recordId) => {
    if (!confirm('¿Restaurar este registro?')) return;

    try {
      await restoreDeletedRecord(selectedTable, recordId);
      toast.success('Registro restaurado exitosamente');
      loadDeletedRecords();
    } catch (error) {
      toast.error('Error al restaurar registro');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderRecordSummary = (data) => {
    if (!data) return '-';

    // Mostrar campos relevantes según la tabla
    if (selectedTable === 'services') {
      return data.name || '-';
    } else if (selectedTable === 'appointments') {
      return `Cita ${formatDate(data.appointment_date)}`;
    } else if (selectedTable === 'clients') {
      return `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || '-';
    } else if (selectedTable === 'professionals') {
      return `${data.first_name || ''} ${data.last_name || ''}`.trim() || '-';
    } else if (selectedTable === 'locations') {
      return data.name || '-';
    }

    return JSON.stringify(data).substring(0, 100) + '...';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center space-x-2">
          <Trash2 className="w-7 h-7 text-slate-600" />
          <span>Papelera</span>
        </h1>
        <p className="text-slate-600">
          Registros eliminados. Se borran permanentemente después de 90 días.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de registro
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {tables.map((table) => (
                <option key={table.value} value={table.value}>
                  {table.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mostrar últimos
            </label>
            <select
              value={daysAgo}
              onChange={(e) => setDaysAgo(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registros eliminados */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : deletedRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No hay registros eliminados</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                  Registro
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                  Eliminado por
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                  Fecha de eliminación
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                  Motivo
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deletedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                    {renderRecordSummary(record.data)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.deleted_by_email || 'Sistema'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(record.deleted_at)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.deletion_reason || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleRestore(record.id)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restaurar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Los registros eliminados se borran permanentemente después de 90 días.
          Los registros restaurados recuperan toda su información original.
        </p>
      </div>
    </div>
  );
}
