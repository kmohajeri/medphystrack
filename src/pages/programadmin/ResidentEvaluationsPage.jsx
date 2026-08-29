import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import AddEditEvaluationModal from '../../components/modals/AddEditEvaluationModal';
import { getResidentById } from '../../lib/api/residents';
import { listResidentModulesWithEvaluations } from '../../lib/api/evaluations';

const STATUS_BADGE = {
  approved: 'bg-green-50 text-green-700',
  pending:  'bg-amber-50 text-amber-700',
};

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

function BooleanChip({ value }) {
  if (value === true)  return <span className="text-green-700 font-medium">Yes</span>;
  if (value === false) return <span className="text-red-700 font-medium">No</span>;
  return <span className="text-slate-400">—</span>;
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ResidentEvaluationsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();

  const [resident, setResident]     = useState(null);
  const [modules, setModules]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [modalTarget, setModalTarget] = useState(null); // { residentModule, evaluation }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, mods] = await Promise.all([
        getResidentById(residentId),
        listResidentModulesWithEvaluations(residentId),
      ]);
      setResident(res);
      setModules(mods);
    } catch (err) {
      setError(err.message || 'Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Group by year
  const byYear = modules.reduce((acc, rm) => {
    const year = rm.module?.year ?? 0;
    if (!acc[year]) acc[year] = [];
    acc[year].push(rm);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate('/program-admin/residents')}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Residents
        </button>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {resident ? `${resident.first_name} ${resident.last_name}` : 'Evaluations'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Module evaluations</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : modules.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No curriculum assigned to this resident.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {year === 0 ? 'Unassigned' : `Year ${year}`}
              </h2>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Competencies</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Reading</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Oral Exam</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {byYear[year].map((rm) => {
                      const ev = rm.evaluations?.[0] ?? null;
                      return (
                        <tr key={rm.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[240px]">
                            {rm.module?.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <BooleanChip value={ev?.competencies_score ?? null} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <BooleanChip value={ev?.reading_score ?? null} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ev?.oral_exam_score ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ORAL_BADGE[ev.oral_exam_score]}`}>
                                {ORAL_LABEL[ev.oral_exam_score]}
                              </span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {!ev ? (
                              <span className="text-slate-400">No evaluation</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${STATUS_BADGE[ev.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {ev.status === 'approved' ? 'Approved' : 'Pending'}
                                </span>
                                {ev.faculty_signed_at && (
                                  <span className="text-xs text-slate-400">Signed {fmt(ev.faculty_signed_at)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setModalTarget({ residentModule: rm, evaluation: ev })}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              {ev ? 'Edit' : 'Create'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTarget && resident && (
        <AddEditEvaluationModal
          residentModule={modalTarget.residentModule}
          resident={resident}
          evaluation={modalTarget.evaluation}
          onClose={() => setModalTarget(null)}
          onSaved={() => { setModalTarget(null); load(); }}
        />
      )}
    </AppLayout>
  );
}
