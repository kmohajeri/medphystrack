import { supabase } from '../supabase';

// ── Committee Members ─────────────────────────────────────────────────────────

export async function listMembers(programId) {
  const { data, error } = await supabase
    .from('committee_members')
    .select('id, name, role, is_active, start_date, end_date, created_at')
    .eq('program_id', programId)
    .order('is_active', { ascending: false })
    .order('name');
  if (error) throw error;
  return data;
}

export async function createMember({ orgId, programId, name, role, isActive, startDate, endDate }) {
  const { data, error } = await supabase
    .from('committee_members')
    .insert({
      org_id: orgId,
      program_id: programId,
      name,
      role: role || null,
      is_active: isActive ?? true,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMember(memberId, { name, role, isActive, startDate, endDate }) {
  const { data, error } = await supabase
    .from('committee_members')
    .update({
      name,
      role: role || null,
      is_active: isActive,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Committee Minutes ─────────────────────────────────────────────────────────

export async function listMinutes(programId) {
  const { data, error } = await supabase
    .from('committee_minutes')
    .select(`
      id, meeting_date, title, content, created_at,
      attendees:minutes_members(
        member:committee_members(id, name, role)
      ),
      files:minutes_files(id, file_name, storage_path, created_at)
    `)
    .eq('program_id', programId)
    .order('meeting_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMinutes({ orgId, programId, meetingDate, title, content }) {
  const { data, error } = await supabase
    .from('committee_minutes')
    .insert({
      org_id: orgId,
      program_id: programId,
      meeting_date: meetingDate,
      title: title || null,
      content: content || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMinutes(minutesId, { meetingDate, title, content }) {
  const { data, error } = await supabase
    .from('committee_minutes')
    .update({
      meeting_date: meetingDate,
      title: title || null,
      content: content || null,
    })
    .eq('id', minutesId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMinutes(minutesId) {
  const { error } = await supabase
    .from('committee_minutes')
    .delete()
    .eq('id', minutesId);
  if (error) throw error;
}

// ── Attendees (minutes_members) ───────────────────────────────────────────────

export async function setAttendees(minutesId, memberIds) {
  // Replace all attendees for a meeting in one operation
  await supabase.from('minutes_members').delete().eq('minutes_id', minutesId);
  if (!memberIds.length) return;
  const { error } = await supabase
    .from('minutes_members')
    .insert(memberIds.map((id) => ({ minutes_id: minutesId, member_id: id })));
  if (error) throw error;
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function uploadMinutesFile(minutesId, programId, file) {
  const ext  = file.name.split('.').pop();
  const path = `${programId}/${minutesId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('minutes-files')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('minutes_files')
    .insert({ minutes_id: minutesId, file_name: file.name, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMinutesFile(fileId, storagePath) {
  await supabase.storage.from('minutes-files').remove([storagePath]);
  const { error } = await supabase.from('minutes_files').delete().eq('id', fileId);
  if (error) throw error;
}

export async function getMinutesFileUrl(storagePath) {
  const { data } = await supabase.storage
    .from('minutes-files')
    .createSignedUrl(storagePath, 60 * 60); // 1-hour signed URL
  return data?.signedUrl ?? null;
}
