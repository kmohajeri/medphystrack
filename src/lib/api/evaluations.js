import { supabase } from '../supabase';

// ── Shared ────────────────────────────────────────────────────────────────────

export async function listResidentModulesWithEvaluations(residentId) {
  const { data, error } = await supabase
    .from('resident_modules')
    .select(`
      id, status, started_at, completed_at,
      module:modules(id, name, year, order_index),
      evaluations:module_evaluations(
        id, competencies_score, reading_score, engaged_with_mentors_staff,
        oral_exam_score, faculty_comments, resident_comments,
        faculty_signed_at, resident_acknowledged_at, status,
        files:evaluation_files(id, file_type, file_name, storage_path, created_at)
      )
    `)
    .eq('resident_id', residentId);
  if (error) throw error;

  return (data ?? [])
    .sort((a, b) => {
      const aYear = a.module?.year ?? 99;
      const bYear = b.module?.year ?? 99;
      if (aYear !== bYear) return aYear - bYear;
      return (a.module?.order_index ?? 0) - (b.module?.order_index ?? 0);
    })
    .map((rm) => ({
      ...rm,
      // newest evaluation first so [0] is always the most recent
      evaluations: (rm.evaluations ?? []).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      ),
    }));
}

export async function listResidentsWithEvaluationSummary(programId) {
  const { data, error } = await supabase
    .from('residents')
    .select(`
      id, first_name, last_name,
      evaluations:module_evaluations(
        id, status, faculty_signed_at, resident_acknowledged_at, oral_exam_score,
        module:modules(id, name)
      )
    `)
    .eq('program_id', programId)
    .order('first_name');
  if (error) throw error;
  return data ?? [];
}

// ── Program Admin ─────────────────────────────────────────────────────────────

export async function createEvaluation({ residentId, moduleId, residentModuleId, ...fields }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('module_evaluations')
    .insert({
      resident_id: residentId,
      module_id: moduleId,
      resident_module_id: residentModuleId,
      faculty_id: user.id,
      ...fields,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvaluation(evaluationId, fields) {
  const { data, error } = await supabase
    .from('module_evaluations')
    .update(fields)
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function signOffEvaluation(evaluationId) {
  const { data, error } = await supabase
    .from('module_evaluations')
    .update({ faculty_signed_at: new Date().toISOString() })
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Resident ─────────────────────────────────────────────────────────────────

export async function listMyEvaluations() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: resident, error: rErr } = await supabase
    .from('residents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!resident) return [];
  return listResidentModulesWithEvaluations(resident.id);
}

export async function acknowledgeEvaluation(evaluationId) {
  const { data, error } = await supabase
    .from('module_evaluations')
    .update({
      resident_acknowledged_at: new Date().toISOString(),
      status: 'approved',
    })
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateResidentComments(evaluationId, residentComments) {
  const { data, error } = await supabase
    .from('module_evaluations')
    .update({ resident_comments: residentComments })
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function uploadEvaluationFile({ evaluationId, programId, residentId, file, fileType }) {
  const path = `${programId}/${residentId}/${evaluationId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('evaluation-files')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('evaluation_files')
    .insert({
      evaluation_id: evaluationId,
      file_type: fileType,
      file_name: file.name,
      storage_path: path,
      uploaded_by: user.id,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from('evaluation-files').remove([path]);
    throw error;
  }
  return data;
}

export async function deleteEvaluationFile(fileId, storagePath) {
  await supabase.storage.from('evaluation-files').remove([storagePath]);
  const { error } = await supabase.from('evaluation_files').delete().eq('id', fileId);
  if (error) throw error;
}

export async function getEvaluationFileUrl(storagePath) {
  const { data } = await supabase.storage
    .from('evaluation-files')
    .createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}
