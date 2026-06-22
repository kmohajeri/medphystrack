// src/lib/api/programs.js
// Phase 4: Program Management (Admin) — Program CRUD + provisioning

import { supabase } from '../supabase';

export async function listPrograms({ includeArchived = false } = {}) {
  let query = supabase
    .from('programs')
    .select('id, name, status, org_id, created_at, archived_at, organizations(name)')
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getProgram(programId) {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, status, org_id, created_at, archived_at, organizations(name)')
    .eq('id', programId)
    .single();

  if (error) throw error;
  return data;
}

export async function provisionProgram({ orgId, programName }) {
  const { data, error } = await supabase.rpc('provision_program', {
    p_org_id: orgId,
    p_program_name: programName,
  });

  if (error) throw error;
  return data;
}

export async function updateProgram(programId, { name }) {
  const { data, error } = await supabase
    .from('programs')
    .update({ name })
    .eq('id', programId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveProgram(programId) {
  const { data, error } = await supabase
    .from('programs')
    .update({ status: 'archived' })
    .eq('id', programId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unarchiveProgram(programId) {
  const { data, error } = await supabase
    .from('programs')
    .update({ status: 'active' })
    .eq('id', programId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProgramCurriculum(programId) {
  const { data, error } = await supabase
    .from('modules')
    .select(`
      id, name, description, order_index, duration_weeks, year,
      tasks (
        id, name, description, resource_url, is_required,
        order_index, task_type, cases_required
      )
    `)
    .eq('program_id', programId)
    .order('order_index', { ascending: true });

  if (error) throw error;

  return data.map((mod) => ({
    ...mod,
    tasks: [...mod.tasks].sort((a, b) => a.order_index - b.order_index),
  }));
}
