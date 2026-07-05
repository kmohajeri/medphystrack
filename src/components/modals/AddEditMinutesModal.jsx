import { useState, useRef } from 'react';
import {
  createMinutes, updateMinutes, setAttendees,
  uploadMinutesFile, deleteMinutesFile, getMinutesFileUrl,
} from '../../lib/api/committee';

export default function AddEditMinutesModal({ minutes, members, orgId, programId, onClose, onSaved }) {
  const isEdit = !!minutes;

  const existingAttendeeIds = new Set(
    (minutes?.attendees ?? []).map((a) => a.member?.id).filter(Boolean)
  );

  const [meetingDate,   setMeetingDate]   = useState(minutes?.meeting_date ?? '');
  const [title,         setTitle]         = useState(minutes?.title        ?? '');
  const [content,       setContent]       = useState(minutes?.content      ?? '');
  const [selectedIds,   setSelectedIds]   = useState(new Set(existingAttendeeIds));
  const [files,         setFiles]         = useState(minutes?.files        ?? []);
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [deletingFile,  setDeletingFile]  = useState(null);
  const [error,         setError]         = useState(null);
  const fileInputRef = useRef(null);

  function toggleMember(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!meetingDate) return;
    setSaving(true);
    setError(null);
    try {
      let minutesId;
      if (isEdit) {
        await updateMinutes(minutes.id, { meetingDate, title, content });
        minutesId = minutes.id;
      } else {
        const created = await createMinutes({ orgId, programId, meetingDate, title, content });
        minutesId = created.id;
      }
      await setAttendees(minutesId, [...selectedIds]);
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    setUploading(true);
    setError(null);
    try {
      const newFile = await uploadMinutesFile(minutes.id, programId, file);
      setFiles((prev) => [...prev, newFile]);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDeleteFile(file) {
    setDeletingFile(file.id);
    try {
      await deleteMinutesFile(file.id, file.storage_path);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeletingFile(null);
    }
  }

  async function handleOpenFile(file) {
    const url = await getMinutesFileUrl(file.storage_path);
    if (url) window.open(url, '_blank');
  }

  const activeMembers   = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active && existingAttendeeIds.has(m.id));
  const displayMembers  = [...activeMembers, ...inactiveMembers];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit meeting minutes' : 'Add meeting minutes'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Steering Committee"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Minutes / Notes</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Record meeting discussion, decisions, and action items…"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>

            {/* Attendees */}
            {displayMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attendees</label>
                <div className="grid grid-cols-2 gap-2">
                  {displayMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{m.name}</p>
                        {m.role && <p className="text-xs text-slate-400 truncate">{m.role}</p>}
                      </div>
                      {!m.is_active && (
                        <span className="ml-auto flex-shrink-0 text-xs text-slate-400">Inactive</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Files — only available after record is saved */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Files</label>
              {!isEdit && (
                <p className="text-xs text-slate-400 mb-2">Save the meeting first, then attach files.</p>
              )}
              {files.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(f)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 truncate"
                      >
                        {f.file_name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(f)}
                        disabled={deletingFile === f.id}
                        className="ml-3 flex-shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingFile === f.id ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {isEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading…' : '+ Attach file'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add minutes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
