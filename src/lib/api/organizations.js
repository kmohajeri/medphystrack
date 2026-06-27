// src/lib/api/organizations.js
import { supabase } from '../supabase';

export async function listOrganizations({ includeArchived = false } = {}) {
  let query = supabase
    .from('organizations')
    .select('id, name, status, created_at, archived_at, programs(id, name)')
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;
  if (error) throw error;
  // Migration 007 added UNIQUE on programs.org_id, which causes PostgREST to
  // return the embedded programs resource as a plain object instead of an
  // array (1-to-1 cardinality inference). Normalize here so all callers can
  // safely use org.programs.length / org.programs[0].
  return (data ?? []).map((org) => ({
    ...org,
    programs:
      org.programs == null
        ? []
        : Array.isArray(org.programs)
          ? org.programs
          : [org.programs],
  }));
}

export async function getOrganization(orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, status, created_at, archived_at, programs(id, name)')
    .eq('id', orgId)
    .single();

  if (error) throw error;
  const programs = data?.programs;
  return {
    ...data,
    programs:
      programs == null
        ? []
        : Array.isArray(programs)
          ? programs
          : [programs],
  };
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

export async function archiveOrganization(orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status: 'archived' })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unarchiveOrganization(orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status: 'active' })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
