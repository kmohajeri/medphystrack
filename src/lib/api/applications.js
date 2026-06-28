import { supabase } from '../supabase';

export async function listApplications(programId, { status } = {}) {
  let query = supabase
    .from('applications')
    .select('id, first_name, last_name, email, status, notes, created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createApplication({ orgId, programId, firstName, lastName, email, notes }) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      org_id: orgId,
      program_id: programId,
      first_name: firstName,
      last_name: lastName,
      email,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateApplication(applicationId, fields) {
  const updates = {};
  if (fields.firstName !== undefined) updates.first_name = fields.firstName;
  if (fields.lastName !== undefined) updates.last_name = fields.lastName;
  if (fields.email !== undefined) updates.email = fields.email;
  if (fields.status !== undefined) updates.status = fields.status;
  if (fields.notes !== undefined) updates.notes = fields.notes;

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listInquiryLogs(applicationId) {
  const { data, error } = await supabase
    .from('inquiry_logs')
    .select('id, note, created_at, created_by')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function addInquiryLog(applicationId, note, userId) {
  const { data, error } = await supabase
    .from('inquiry_logs')
    .insert({ application_id: applicationId, note, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listApplicationFiles(applicationId) {
  const { data, error } = await supabase
    .from('application_files')
    .select('id, file_type, file_name, storage_path, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function uploadApplicationFile(applicationId, programId, file, fileType) {
  const ext = file.name.split('.').pop();
  const storagePath = `${programId}/${applicationId}/${fileType}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('application-files')
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('application_files')
    .insert({
      application_id: applicationId,
      file_type: fileType,
      file_name: file.name,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteApplicationFile(fileId, storagePath) {
  await supabase.storage.from('application-files').remove([storagePath]);
  const { error } = await supabase.from('application_files').delete().eq('id', fileId);
  if (error) throw error;
}

export async function getFileUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('application-files')
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}
