import { useState } from 'react';
import {
  createEvaluation,
  updateEvaluation,
  signOffEvaluation,
  getEvaluationFileUrl,
} from '../../lib/api/evaluations';

const ORAL_OPTIONS = [
  { value: 'pass', label: 'Pass' },
  { value: 'conditional_pass', label: 'Conditional Pass' },
  { value: 'fail', label: 'Fail' },
];

const ORAL_BADGE = {
  pass: 'bg-green-50 text-green-700',
  conditional_pass: 'bg-amber-50 text-amber-700',
  fail: 'bg-red-50 text-red-700',
};

const FILE_TYPE_LABEL = {
  presentation: 'Presentation',
  supplementary: 'Supplementary',
};

function BooleanToggle({ value, onChange, disabled }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === v ? null : v)}
          className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:cursor-not-allowed ${
            value === v
              ? v
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-red-600 border-red-600 text-white'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
          }`}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function BooleanDisplay({ value }) {
  if (value === true)  return <span className="text-green-700 font-medium">Yes</span>;
  if (value === false) return <span className="text-red-700 font-medium">No</span>;
  return <span className="text-slate-400">—</span>;
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AddEditEvaluationModal({ residentModule, resident, evaluation: initialEval, onClose, onSaved }) {
  const [competencies, setCompetencies]   = useState(initialEval?.competencies_score ?? null);
  const [reading, setReading]             = useState(initialEval?.reading_score ?? null);
  const [engaged, setEngaged]             = useState(initialEval?.engaged_with_mentors_staff ?? null);
  const [oralScore, setOralScore]         = useState(initialEval?.oral_exam_score ?? '');
  const [facultyComments, setFacultyComments] = useState(initialEval?.faculty_comments ?? '');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState(null);
  const [signOffConfirm, setSignOffConfirm] = useState(false);

  const isSigned = !!initialEval?.faculty_signed_at;
  const files    = initialEval?.files ?? [];

  function buildFields() {
    return {
      competencies_score:         competencies,
      reading_score:              reading,
      engaged_with_mentors_staff: engaged,
      oral_exam_score:            oralScore || null,
      faculty_comments:           facultyComments || null,
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (initialEval) {
        await updateEvaluation(initialEval.id, buildFields());
      } else {
        await createEvaluation({
          residentId:        resident.id,
          moduleId:          residentModule.module.id,
          residentModuleId:  residentModule.id,
          ...buildFields(),
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOff() {
    setSaving(true);
    setError(null);
    try {
      let evalId = initialEval?.id;
      if (!evalId) {
        const created = await createEvaluation({
          residentId:       resident.id,
          moduleId:         residentModule.module.id,
          residentModuleId: residentModule.id,
          ...buildFields(),
        });
        evalId = created.id;
      } else {
        await updateEvaluation(evalId, buildFields());
      }
      await signOffEvaluation(evalId);
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to sign off');
    } finally {
      setSaving(false);
      setSignOffConfirm(false);
    }
  }

  async function handleDownload(file) {
    const url = await getEvaluationFileUrl(file.storage_path);
    if (url) window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Module Evaluation</h2>
            <p className="mt-0.5 text-sm text-slate-500">{residentModule.module?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Signed-off banner */}
          {isSigned && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Faculty signed off on {fmt(initialEval.faculty_signed_at)}. This evaluation is locked.
            </div>
          )}

          {/* Assessment fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Faculty Assessment</h3>

            <div className="space-y-3">
              {/* Competencies */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Competencies completed</label>
                {isSigned
                  ? <BooleanDisplay value={competencies} />
                  : <BooleanToggle value={competencies} onChange={setCompetencies} disabled={saving} />}
              </div>

              {/* Reading */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Reading assignments completed</label>
                {isSigned
                  ? <BooleanDisplay value={reading} />
                  : <BooleanToggle value={reading} onChange={setReading} disabled={saving} />}
              </div>

              {/* Engaged */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Engaged with mentors / staff</label>
                {isSigned
                  ? <BooleanDisplay value={engaged} />
                  : <BooleanToggle value={engaged} onChange={setEngaged} disabled={saving} />}
              </div>

              {/* Oral exam */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Oral exam score</label>
                {isSigned ? (
                  oralScore ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ORAL_BADGE[oralScore]}`}>
                      {ORAL_OPTIONS.find(o => o.value === oralScore)?.label}
                    </span>
                  ) : <span className="text-slate-400 text-sm">—</span>
                ) : (
                  <select
                    value={oralScore}
                    onChange={(e) => setOralScore(e.target.value)}
                    disabled={saving}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select…</option>
                    {ORAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Faculty comments */}
            <div>
              <label className="block text-sm text-slate-700 mb-1">Faculty comments</label>
              {isSigned ? (
                <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[2rem]">
                  {facultyComments || <span className="text-slate-400">None</span>}
                </p>
              ) : (
                <textarea
                  value={facultyComments}
                  onChange={(e) => setFacultyComments(e.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder="Optional comments for the resident…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50 resize-none"
                />
              )}
            </div>
          </div>

          {/* Resident files */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Resident Files</h3>
            {files.length === 0 ? (
              <p className="text-sm text-slate-400">No files uploaded by resident.</p>
            ) : (
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate max-w-[260px]">{f.file_name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-400">{FILE_TYPE_LABEL[f.file_type] ?? f.file_type}</span>
                      <button
                        onClick={() => handleDownload(f)}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                      >
                        Download
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resident response (read-only for admin) */}
          {initialEval && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Resident Response</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[2rem]">
                {initialEval.resident_comments || <span className="text-slate-400">No comments from resident.</span>}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {initialEval.resident_acknowledged_at
                  ? `Acknowledged on ${fmt(initialEval.resident_acknowledged_at)}`
                  : 'Not yet acknowledged by resident'}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Sign-off confirmation */}
          {signOffConfirm && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
              <p className="text-sm text-amber-800 font-medium">Sign off on this evaluation?</p>
              <p className="text-xs text-amber-700">
                This will lock the evaluation. Scores and comments cannot be changed after signing off.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSignOff}
                  disabled={saving}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? 'Signing off…' : 'Confirm Sign Off'}
                </button>
                <button
                  onClick={() => setSignOffConfirm(false)}
                  disabled={saving}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800">
            Close
          </button>
          {!isSigned && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving && !signOffConfirm ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setSignOffConfirm(true)}
                disabled={saving || signOffConfirm}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Sign Off
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
