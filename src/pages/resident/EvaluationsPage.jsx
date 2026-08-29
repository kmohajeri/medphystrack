import { useEffect, useRef, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getMyResident } from '../../lib/api/residentPortal';
import {
  listMyEvaluations,
  acknowledgeEvaluation,
  updateResidentComments,
  uploadEvaluationFile,
  deleteEvaluationFile,
  getEvaluationFileUrl,
} from '../../lib/api/evaluations';

const ORAL_BADGE = {
  pass:             'bg-green-50 text-green-700',
  conditional_pass: 'bg-amber-50 text-amber-700',
  fail:             'bg-red-50 text-red-700',
};
const ORAL_LABEL = {
  pass:             'Pass',
  conditional_pass: 'Conditional Pass',
  fail:             'Fail',
};
const FILE_TYPE_LABEL = {
  presentation:  'Presentation',
  supplementary: 'Supplementary',
};

function BooleanChip({ value }) {
  if (value === true)  return <span className="text-green-700 font-medium">✓ Yes</span>;
  if (value === false) return <span className="text-red-700 font-medium">✗ No</span>;
  return <span className="text-slate-400">—</span>;
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EvaluationCard({ rm, resident, isOpen, onToggle, onUpdated }) {
  const ev = rm.evaluations?.[0] ?? null;

  const isSigned       = !!ev?.faculty_signed_at;
  const isAcknowledged = !!ev?.resident_acknowledged_at;

  const [comments, setComments]         = useState(ev?.resident_comments ?? '');
  const [savingComments, setSavingComments] = useState(false);
  const commentsTimer                   = useRef(null);

  const [fileType, setFileType]   = useState('presentation');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef              = useRef(null);

  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError]           = useState(null);

  function handleCommentsChange(e) {
    const val = e.target.value;
    setComments(val);
    clearTimeout(commentsTimer.current);
    commentsTimer.current = setTimeout(async () => {
      if (!ev) return;
      setSavingComments(true);
      try {
        await updateResidentComments(ev.id, val);
      } finally {
        setSavingComments(false);
      }
    }, 800);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !ev) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadEvaluationFile({
        evaluationId: ev.id,
        programId:    resident.program_id,
        residentId:   resident.id,
        file,
        fileType,
      });
      onUpdated();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteFile(fileId, storagePath) {
    setUploadError(null);
    try {
      await deleteEvaluationFile(fileId, storagePath);
      onUpdated();
    } catch (err) {
      setUploadError(err.message || 'Delete failed');
    }
  }

  async function handleDownload(file) {
    const url = await getEvaluationFileUrl(file.storage_path);
    if (url) window.open(url, '_blank');
  }

  async function handleAcknowledge() {
    if (!ev) return;
    setAcknowledging(true);
    setAckError(null);
    try {
      await acknowledgeEvaluation(ev.id);
      onUpdated();
    } catch (err) {
      setAckError(err.message || 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  }

  const statusBadge = () => {
    if (!ev) return <span className="text-xs text-slate-400">No evaluation yet</span>;
    if (isAcknowledged)
      return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    if (isSigned)
      return <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Awaiting acknowledgment</span>;
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">In progress</span>;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => ev && onToggle(rm.id)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${ev ? 'hover:bg-slate-50' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-3">
          {ev && (
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {!ev && <span className="w-4 shrink-0" />}
          <span className="text-sm font-medium text-slate-900">{rm.module?.name}</span>
        </div>
        <div className="shrink-0 ml-4">{statusBadge()}</div>
      </button>

      {isOpen && ev && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-5">

          {/* Faculty assessment */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Faculty Assessment</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Competencies completed</span>
                <BooleanChip value={ev.competencies_score} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reading assignments completed</span>
                <BooleanChip value={ev.reading_score} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Engaged with mentors / staff</span>
                <BooleanChip value={ev.engaged_with_mentors_staff} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Oral exam</span>
                {ev.oral_exam_score ? (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ORAL_BADGE[ev.oral_exam_score]}`}>
                    {ORAL_LABEL[ev.oral_exam_score]}
                  </span>
                ) : <span className="text-slate-400">—</span>}
              </div>
            </div>
            {ev.faculty_comments && (
              <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 mb-1">Faculty comments</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ev.faculty_comments}</p>
              </div>
            )}
            {isSigned && (
              <p className="mt-2 text-xs text-slate-400">Signed {fmt(ev.faculty_signed_at)}</p>
            )}
          </div>

          {/* Files */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Your Presentation Files</h4>
            {ev.files?.length > 0 ? (
              <ul className="space-y-1 mb-3">
                {ev.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate max-w-[220px]">{f.file_name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-400">{FILE_TYPE_LABEL[f.file_type] ?? f.file_type}</span>
                      <button
                        onClick={() => handleDownload(f)}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                      >
                        Download
                      </button>
                      {!isSigned && (
                        <button
                          onClick={() => handleDeleteFile(f.id, f.storage_path)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 mb-3">No files uploaded yet.</p>
            )}

            {!isSigned && (
              <div className="flex items-center gap-2">
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="presentation">Presentation</option>
                  <option value="supplementary">Supplementary</option>
                </select>
                <label className={`rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-slate-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? 'Uploading…' : 'Upload file'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          </div>

          {/* Resident comments */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Your Comments</h4>
            {isAcknowledged ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {comments || <span className="text-slate-400">No comments added.</span>}
              </p>
            ) : (
              <div>
                <textarea
                  value={comments}
                  onChange={handleCommentsChange}
                  rows={3}
                  placeholder="Add your response or notes about this evaluation…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
                />
                {savingComments && <p className="text-xs text-slate-400 mt-0.5">Saving…</p>}
              </div>
            )}
          </div>

          {/* Acknowledge */}
          {isSigned && !isAcknowledged && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800 mb-2">
                Your program director has signed off on this evaluation. Please review and acknowledge.
              </p>
              {ackError && <p className="text-xs text-red-600 mb-2">{ackError}</p>}
              <button
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {acknowledging ? 'Acknowledging…' : 'Acknowledge & Sign Off'}
              </button>
            </div>
          )}

          {isAcknowledged && (
            <p className="text-xs text-green-700">
              ✓ You acknowledged this evaluation on {fmt(ev.resident_acknowledged_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvaluationsPage() {
  const [resident, setResident] = useState(null);
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [openIds, setOpenIds]   = useState(new Set());

  function toggleOpen(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, mods] = await Promise.all([getMyResident(), listMyEvaluations()]);
      setResident(res);
      setModules(mods);
    } catch (err) {
      setError(err.message || 'Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byYear = modules.reduce((acc, rm) => {
    const year = rm.module?.year ?? 0;
    if (!acc[year]) acc[year] = [];
    acc[year].push(rm);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold text-slate-900">Evaluations</h1>
      <p className="mt-1 text-sm text-slate-500">Your module evaluations from your program director</p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : !resident ? (
        <p className="mt-6 text-sm text-slate-500">No resident record found. Contact your program administrator.</p>
      ) : modules.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No curriculum assigned yet.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {year === 0 ? 'Unassigned' : `Year ${year}`}
              </h2>
              <div className="space-y-2">
                {byYear[year].map((rm) => (
                  <EvaluationCard
                    key={rm.id}
                    rm={rm}
                    resident={resident}
                    isOpen={openIds.has(rm.id)}
                    onToggle={toggleOpen}
                    onUpdated={load}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
