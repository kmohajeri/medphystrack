import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  updateApplication,
  listInquiryLogs,
  addInquiryLog,
  listApplicationFiles,
  uploadApplicationFile,
  deleteApplicationFile,
  getFileUrl,
} from '../../lib/api/applications';

const STATUS_OPTIONS = ['inquiry', 'pending', 'approved', 'declined'];

const STATUS_BADGE = {
  inquiry:  'bg-slate-100 text-slate-600',
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
};

const FILE_TYPE_LABELS = {
  transcript:          'Transcript',
  personal_statement:  'Personal Statement',
  cv:                  'CV / Résumé',
  reference:           'Reference Letter',
  accept_decline_letter: 'Accept/Decline Letter',
  other:               'Other',
};

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicationDetailModal({ application: initialApp, programId, onClose, onChanged }) {
  const { profile } = useAuth();

  const [app, setApp]           = useState(initialApp);
  const [status, setStatus]     = useState(initialApp.status);
  const [notes, setNotes]       = useState(initialApp.notes ?? '');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [newNote, setNewNote]   = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [files, setFiles]       = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploadFileType, setUploadFileType] = useState('transcript');
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await listInquiryLogs(app.id);
        setLogs(data);
      } catch {
        // non-fatal
      } finally {
        setLogsLoading(false);
      }
    }
    async function fetchFiles() {
      try {
        const data = await listApplicationFiles(app.id);
        setFiles(data);
      } catch {
        // non-fatal
      } finally {
        setFilesLoading(false);
      }
    }
    fetchLogs();
    fetchFiles();
  }, [app.id]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateApplication(app.id, { status, notes });
      setApp(updated);
      onChanged();
    } catch (err) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const entry = await addInquiryLog(app.id, newNote.trim(), profile.id);
      setLogs((prev) => [...prev, entry]);
      setNewNote('');
    } catch {
      // non-fatal, note just doesn't appear
    } finally {
      setAddingNote(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileError(null);
    try {
      const newFile = await uploadApplicationFile(app.id, programId, file, uploadFileType);
      setFiles((prev) => [...prev, newFile]);
    } catch (err) {
      setFileError(err.message || 'Upload failed. Make sure the "application-files" storage bucket has been created in Supabase.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(f) {
    try {
      const url = await getFileUrl(f.storage_path);
      window.open(url, '_blank');
    } catch {
      // non-fatal
    }
  }

  async function handleDelete(f) {
    try {
      await deleteApplicationFile(f.id, f.storage_path);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } catch {
      // non-fatal
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {app.first_name} {app.last_name}
            </h2>
            <p className="text-xs text-slate-500">{app.email} · Added {fmt(app.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Details section */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block w-48 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="General notes about this applicant…"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Inquiry log */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Inquiry Log</h3>
            {logsLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-400">No notes yet.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {logs.map((entry) => (
                  <li key={entry.id} className="rounded-md bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.note}</p>
                    <p className="mt-1 text-xs text-slate-400">{fmt(entry.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note…"
                disabled={addingNote}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={addingNote || !newNote.trim()}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {addingNote ? 'Adding…' : 'Add'}
              </button>
            </form>
          </section>

          <hr className="border-slate-100" />

          {/* Files */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Files</h3>
            {filesLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-slate-400 mb-3">No files uploaded.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md mb-3">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{f.file_name}</span>
                      <span className="ml-2 text-xs text-slate-400">{FILE_TYPE_LABELS[f.file_type] ?? f.file_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDownload(f)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <select
                value={uploadFileType}
                onChange={(e) => setUploadFileType(e.target.value)}
                disabled={uploading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                {Object.entries(FILE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload file'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
            {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
