// ═══════════════════════════════════════════════════════════════
// supabase/functions/_shared/supabase-client.ts
// Crear cliente Supabase con el JWT del usuario en Edge Functions
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cliente con permisos del usuario autenticado (respeta RLS)
export function createUserClient(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );
}

// Cliente con permisos de servicio (ignora RLS — usar con cuidado)
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}
