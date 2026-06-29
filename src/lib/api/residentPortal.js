import { supabase } from '../supabase';

export async function getMyResident() {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Single query for the full curriculum view: modules + nested tasks
export async function getMyCurriculum() {
  const { data, error } = await supabase
    .from('resident_modules')
    .select(`
      id, status, started_at, completed_at,
      module:modules(id, name, description, year, order_index, duration_weeks),
      tasks:resident_tasks(
        id, status, notes, completed_at,
        task:tasks(id, name, task_type, description, resource_url, is_required, order_index)
      )
    `);
  if (error) throw error;

  // Sort modules by order_index; sort tasks within each module
  return (data ?? [])
    .sort((a, b) => (a.module?.order_index ?? 0) - (b.module?.order_index ?? 0))
    .map((rm) => ({
      ...rm,
      tasks: (rm.tasks ?? []).sort(
        (a, b) => (a.task?.order_index ?? 0) - (b.task?.order_index ?? 0)
      ),
    }));
}

// Program-admin view: curriculum for a specific resident (filtered by resident_id)
export async function getResidentCurriculum(residentId) {
  const { data, error } = await supabase
    .from('resident_modules')
    .select(`
      id, status, started_at, completed_at,
      module:modules(id, name, description, year, order_index, duration_weeks),
      tasks:resident_tasks(
        id, status, notes, completed_at,
        task:tasks(id, name, task_type, description, resource_url, is_required, order_index)
      )
    `)
    .eq('resident_id', residentId);
  if (error) throw error;

  return (data ?? [])
    .sort((a, b) => (a.module?.order_index ?? 0) - (b.module?.order_index ?? 0))
    .map((rm) => ({
      ...rm,
      tasks: (rm.tasks ?? []).sort(
        (a, b) => (a.task?.order_index ?? 0) - (b.task?.order_index ?? 0)
      ),
    }));
}

export async function getMyStats() {
  const [modulesRes, totalRes, completedRes] = await Promise.all([
    supabase.from('resident_modules').select('*', { count: 'exact', head: true }),
    supabase.from('resident_tasks').select('*', { count: 'exact', head: true }),
    supabase
      .from('resident_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ]);

  if (modulesRes.error) throw modulesRes.error;
  if (totalRes.error) throw totalRes.error;
  if (completedRes.error) throw completedRes.error;

  const totalTasks = totalRes.count ?? 0;
  const completedTasks = completedRes.count ?? 0;

  return {
    moduleCount: modulesRes.count ?? 0,
    totalTasks,
    completedTasks,
    remainingTasks: totalTasks - completedTasks,
  };
}

export async function updateTaskStatus(residentTaskId, status) {
  const updates = { status };
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from('resident_tasks')
    .update(updates)
    .eq('id', residentTaskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskNotes(residentTaskId, notes) {
  const { data, error } = await supabase
    .from('resident_tasks')
    .update({ notes: notes || null })
    .eq('id', residentTaskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateModuleStatus(residentModuleId, status, currentStartedAt) {
  const updates = { status };
  if (status === 'not_started') {
    updates.started_at = null;
    updates.completed_at = null;
  } else if (status === 'in_progress') {
    updates.started_at = currentStartedAt ?? new Date().toISOString();
    updates.completed_at = null;
  } else if (status === 'completed') {
    updates.started_at = currentStartedAt ?? new Date().toISOString();
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('resident_modules')
    .update(updates)
    .eq('id', residentModuleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
