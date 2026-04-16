// ═══════════════════════════════════════════════════════════════
// src/lib/supabase.js
// Cliente Supabase — reemplaza apiClient.js + authService.js
//
// CAMBIO PRINCIPAL vs arquitectura .NET:
// Antes: React → Axios → API .NET → EF Core → PostgreSQL
// Ahora: React → supabase-js → Supabase (Auth + DB + Storage)
//
// Un solo import en toda la app:
//   import { supabase } from '@/lib/supabase';
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
    'Copie .env.example como .env y configure sus credenciales de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir sesión en localStorage (se mantiene al refrescar página)
    persistSession: true,
    // Detectar sesión automáticamente al cargar la app
    autoRefreshToken: true,
    // Detectar cambios de sesión en otras pestañas
    detectSessionInUrl: true,
  },
});
