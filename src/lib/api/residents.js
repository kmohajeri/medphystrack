import { supabase } from '../supabase';

export async function listResidents(programId) {
  const { data, error } = await supabase
    .from('residents')
    .select('id, first_name, last_name, email, start_date, end_date, status, created_at, resident_modules(id)')
    .eq('program_id', programId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createResident({ orgId, programId, firstName, lastName, email, startDate, endDate }) {
  const { data, error } = await supabase
    .from('residents')
    .insert({
      org_id: orgId,
      program_id: programId,
      first_name: firstName,
      last_name: lastName,
      email,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateResident(residentId, { firstName, lastName, email, startDate, endDate, status }) {
  const { data, error } = await supabase
    .from('residents')
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
    })
    .eq('id', residentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignCurriculum(residentId) {
  const { error } = await supabase.rpc('assign_curriculum', {
    p_resident_id: residentId,
  });

  if (error) throw error;
}
