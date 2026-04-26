import { useState } from 'react';
import { Users, Send } from 'lucide-react';
import InvitationsTab from '../../components/InvitationsTab';

// IMPORTANTE: importa aquí tu componente UsersTab original
// (el contenido actual de UsersPage.jsx sin el wrapper de página)
// Si no lo tienes separado en componente, déjalo inline aquí

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Gestión de Usuarios
        </h1>
        <p className="text-slate-600">
          Administra usuarios e invitaciones del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-teal-600 text-teal-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Usuarios Activos</span>
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-4 px-1 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'invitations'
                ? 'border-teal-600 text-teal-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>Invitaciones</span>
          </button>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div>
        {activeTab === 'users' && (
          <div>
            {/* AQUÍ va el contenido ACTUAL de tu UsersPage.jsx */}
            {/* (tabla de usuarios, botones, modales, etc.) */}
            <p className="text-slate-600">
              Contenido de usuarios activos (pega aquí tu código actual de UsersPage)
            </p>
          </div>
        )}

        {activeTab === 'invitations' && <InvitationsTab />}
      </div>
    </div>
  );
}
