// ═══════════════════════════════════════════════════════════════
// src/config/supabaseClient.js
// Re-export del cliente oficial — VERSION RECOVERY-26-04-2026
//
// CONTEXTO:
// Algunos archivos del proyecto importan desde aquí (config/supabaseClient)
// y otros desde 'lib/supabase'. Para evitar tener DOS instancias del cliente
// Supabase (lo que causa que la sesión se pierda entre archivos), este
// archivo simplemente re-exporta la instancia oficial de lib/supabase.
//
// Resultado: todos los archivos comparten la MISMA sesión y el MISMO cliente.
// ═══════════════════════════════════════════════════════════════

export { supabase } from '../lib/supabase';
