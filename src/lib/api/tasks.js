import { supabase } from '../supabase';

export async function createTask(moduleId, {
  name,
  task_type,
  description = null,
  resource_url = null,
  is_required = true,
  cases_required = null,
}) {
  const { data: existing, error: fetchErr } = await supabase
    .from('tasks')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1);
  if (fetchErr) throw fetchErr;

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('tasks')
    .insert({ module_id: moduleId, name, task_type, description, resource_url, is_required, cases_required, order_index: nextIndex })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(taskId, {
  name,
  task_type,
  description,
  resource_url,
  is_required,
  cases_required,
}) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ name, task_type, description, resource_url, is_required, cases_required })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw error;
}

export async function moveTask(taskId, otherTaskId, currentIndex, otherIndex) {
  const { error: e1 } = await supabase
    .from('tasks')
    .update({ order_index: otherIndex })
    .eq('id', taskId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from('tasks')
    .update({ order_index: currentIndex })
    .eq('id', otherTaskId);
  if (e2) throw e2;
}
