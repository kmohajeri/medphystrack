import { supabase } from '../supabase';

export async function createModule(programId, { name, description = null, year = null, duration_weeks = null }) {
  const { data: existing, error: fetchErr } = await supabase
    .from('modules')
    .select('order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: false })
    .limit(1);
  if (fetchErr) throw fetchErr;

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('modules')
    .insert({ program_id: programId, name, description, year, duration_weeks, order_index: nextIndex })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateModule(moduleId, { name, description, year, duration_weeks }) {
  const { data, error } = await supabase
    .from('modules')
    .update({ name, description, year, duration_weeks })
    .eq('id', moduleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteModule(moduleId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);
  if (error) throw error;
}

export async function moveModule(moduleId, otherModuleId, currentIndex, otherIndex) {
  const { error: e1 } = await supabase
    .from('modules')
    .update({ order_index: otherIndex })
    .eq('id', moduleId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from('modules')
    .update({ order_index: currentIndex })
    .eq('id', otherModuleId);
  if (e2) throw e2;
}
