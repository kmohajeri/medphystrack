import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listResidentsWithEvaluationSummary } from '../../lib/api/evaluations';

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

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EvaluationsOverviewPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram]     = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const prog = await getProgramByOrgId(profile.org_id);
        const data = await listResidentsWithEvaluationSummary(prog.id);
        setProgram(prog);
        setResidents(data);
      } catch (err) {
        setError(err.message || 'Failed to load evaluations');
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalEvals    = residents.reduce((sum, r) => sum + (r.evaluations?.length ?? 0), 0);
  const approvedEvals = residents.reduce((sum, r) => sum + (r.evaluations?.filter(e => e.status === 'approved').length ?? 0), 0);
  const signedEvals   = residents.reduce((sum, r) => sum + (r.evaluations?.filter(e => e.faculty_signed_at && e.status !== 'approved').length ?? 0), 0);

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Evaluations</h1>
          {program && <p className="mt-1 text-sm text-slate-500">{program.name}</p>}
        </div>
      </div>

      {/* Summary stats */}
      {!loading && !error && (
        <div className="mt-4 flex gap-4">
          {[
            { label: 'Total evaluations', value: totalEvals },
            { label: 'Awaiting acknowledgment', value: signedEvals },
            { label: 'Approved', value: approvedEvals },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center min-w-[120px]">
              <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : residents.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No residents found.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {residents.map((r) => {
            const evals = r.evaluations ?? [];
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-medium text-slate-900">{r.first_name} {r.last_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">{evals.length} evaluation{evals.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/program-admin/residents/${r.id}/evaluations`); }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Manage →
                    </button>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    {evals.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">No evaluations submitted yet.</p>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Module</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Oral Exam</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Signed</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {evals.map((ev) => (
                            <tr key={ev.id}>
                              <td className="px-4 py-2 text-sm text-slate-700">{ev.module?.name ?? '—'}</td>
                              <td className="px-4 py-2 text-sm">
                                {ev.oral_exam_score ? (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ORAL_BADGE[ev.oral_exam_score]}`}>
                                    {ORAL_LABEL[ev.oral_exam_score]}
                                  </span>
                                ) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-500">{fmt(ev.faculty_signed_at) ?? '—'}</td>
                              <td className="px-4 py-2 text-sm">
                                {ev.status === 'approved'
                                  ? <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                                  : ev.faculty_signed_at
                                    ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Awaiting ack.</span>
                                    : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">In progress</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
