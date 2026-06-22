// src/lib/api/programs.js
// Phase 4: Program Management (Admin) — Program CRUD + provisioning

import { supabase } from '../supabase';

export async function listPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, org_id, created_at, organizations(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProgram(programId) {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, org_id, created_at, organizations(name)')
    .eq('id', programId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a program for an org and copies the stock 13-module / 149-task
 * curriculum into the program's own modules/tasks tables.
 *
 * This calls the provision_program Postgres function (see
 * supabase/migrations/008_provision_program_rpc.sql) rather than doing
 * the insert + copy as separate client calls, so the whole operation
 * is one atomic transaction — no risk of a program ending up with a
 * partial or missing curriculum if something fails midway.
 *
 * Throws if the org already has a program (programs.org_id is UNIQUE)
 * or if the caller isn't a super admin.
 *
 * @returns {Promise<string>} the new program's id
 */
export async function provisionProgram({ orgId, programName }) {
  const { data, error } = await supabase.rpc('provision_program', {
    p_org_id: orgId,
    p_program_name: programName,
  });

  if (error) throw error;
  return data; // uuid of the new program
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

/**
 * Deleting a program cascades to its modules/tasks/residents/etc.
 * Destructive — confirm with the user before calling.
 */
export async function deleteProgram(programId) {
  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId);

  if (error) throw error;
}

/**
 * Curriculum preview: modules with their tasks, ordered, for a given
 * program. Used by both the Super Admin program detail view and the
 * Program Admin's Curriculum page.
 */
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

  // Sort tasks within each module by order_index (nested select doesn't
  // guarantee child ordering)
  return data.map((mod) => ({
    ...mod,
    tasks: [...mod.tasks].sort((a, b) => a.order_index - b.order_index),
  }));
}
