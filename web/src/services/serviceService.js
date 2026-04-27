// ═══════════════════════════════════════════════════════════════
// src/services/serviceService.js
// CRUD del catálogo de servicios
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase';

const serviceService = {
  getAll: async () => {
    const { data, error } = await supabase.rpc('get_tenant_services');
    if (error) throw error;
    return data || [];
  },

  getCategories: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  createCategory: async (name, icon = '📋') => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;

    const { data, error } = await supabase
      .from('service_categories')
      .insert({ tenant_id: tenantId, name, icon })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  create: async (service) => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.app_metadata?.tenant_id;
    const userId = session?.user?.id;

    const { professional_ids, location_ids, ...serviceData } = service;

    const { data, error } = await supabase
      .from('services')
      .insert({
        ...serviceData,
        tenant_id: tenantId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Asignar profesionales
    if (professional_ids?.length > 0) {
      await supabase.from('service_professionals').insert(
        professional_ids.map(pid => ({ service_id: data.id, professional_id: pid }))
      );
    }

    // Asignar sedes
    if (location_ids?.length > 0) {
      await supabase.from('service_locations').insert(
        location_ids.map(lid => ({ service_id: data.id, location_id: lid }))
      );
    }

    return data;
  },

  update: async (id, updates) => {
    const { professional_ids, location_ids, ...serviceData } = updates;

    const { error } = await supabase
      .from('services')
      .update({
        name: serviceData.name,
        description: serviceData.description,
        category_id: serviceData.category_id,
        duration_minutes: serviceData.duration_minutes,
        price: serviceData.price,
        cost: serviceData.cost,
        color: serviceData.color,
        accepts_online: serviceData.accepts_online,
        requires_payment: serviceData.requires_payment,
        buffer_minutes: serviceData.buffer_minutes,
        notes: serviceData.notes,
        is_active: serviceData.is_active,
      })
      .eq('id', id);

    if (error) throw error;

    // Actualizar profesionales
    if (professional_ids !== undefined) {
      await supabase.from('service_professionals').delete().eq('service_id', id);
      if (professional_ids.length > 0) {
        await supabase.from('service_professionals').insert(
          professional_ids.map(pid => ({ service_id: id, professional_id: pid }))
        );
      }
    }

    // Actualizar sedes
    if (location_ids !== undefined) {
      await supabase.from('service_locations').delete().eq('service_id', id);
      if (location_ids.length > 0) {
        await supabase.from('service_locations').insert(
          location_ids.map(lid => ({ service_id: id, location_id: lid }))
        );
      }
    }
  },

  // Cuenta rápida de servicios activos del tenant (para detección de onboarding)
  count: async () => {
    const { count, error } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('is_active', true);
    if (error) return 0;
    return count || 0;
  },

  remove: async (id) => {
    const { error } = await supabase
      .from('services')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

export default serviceService;
