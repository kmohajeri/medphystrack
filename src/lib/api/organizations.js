// src/lib/api/organizations.js
// Phase 4: Program Management (Admin) — Organization CRUD
// Plain client-side CRUD, RLS-protected. Single table, no atomicity
// concerns, so no RPC needed here (contrast with programs.js, which
// wraps program creation in the provision_program RPC).

import { supabase } from '../supabase';

/**
 * List all organizations, with their linked program (if any) so the
 * UI can show provisioning status at a glance.
 */
export async function listOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, created_at, programs(id, name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOrganization(orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, created_at, programs(id, name)')
    .eq('id', orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function createOrganization({ name }) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(orgId, { name }) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deleting an organization cascades to its program (and that program's
 * modules/tasks/residents/etc. per FK ON DELETE CASCADE). Callers must
 * confirm with the user before calling this — it is destructive and
 * cannot be undone.
 */
export async function deleteOrganization(orgId) {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId);

  if (error) throw error;
}
