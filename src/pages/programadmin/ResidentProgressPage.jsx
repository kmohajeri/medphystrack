import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getResidentById } from '../../lib/api/residents';
import { getResidentCurriculum } from '../../lib/api/residentPortal';

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_TYPE_BADGE = {
  clinical: 'bg-blue-50 text-blue-700',
  reading:  'bg-purple-50 text-purple-700',
};

const TASK_STATUS_BADGE = {
  not_started:    'bg-slate-100 text-slate-500',
  in_progress:    'bg-blue-50 text-blue-700',
  completed:      'bg-green-50 text-green-700',
  not_applicable: 'bg-slate-100 text-slate-400',
};

const TASK_STATUS_LABEL = {
  not_started:    'Not started',
  in_progress:    'In progress',
  completed:      'Completed',
  not_applicable: 'N/A',
};

const MODULE_STATUS_BADGE = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-green-50 text-green-700',
};

const MODULE_STATUS_LABEL = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed:   'Complete',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function taskProgress(tasks) {
  if (!tasks || tasks.length === 0) return { done: 0, total: 0 };
  const applicable = tasks.filter((t) => t.status !== 'not_applicable');
  const done = applicable.filter((t) => t.status === 'completed').length;
  return { done, total: applicable.length };
}

function moduleProgress(tasks) {
  if (!tasks || tasks.length === 0) return null;
  const total      = tasks.length;
  const completed  = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const na         = tasks.filter((t) => t.status === 'not_applicable').length;
  const notStarted = total - completed - inProgress - na;
  return { completed, inProgress, notStarted, na, total };
}

function groupByYear(modules) {
  const years = {};
  for (const rm of modules) {
    const y = rm.module?.year ?? null;
    const key = y != null ? String(y) : 'unassigned';
    if (!years[key]) years[key] = [];
    years[key].push(rm);
  }
  return years;
}

function yearLabel(key) {
  return key === 'unassigned' ? 'Unassigned' : `Year ${key}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResidentProgressPage() {
  const { residentId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { from = '/program-admin/residents', fromLabel = 'Back to Residents' } = location.state ?? {};

  const [resident, setResident]   = useState(null);
  const [modules, setModules]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [expanded, setExpanded]   = useState(new Set());

  useEffect(() => {
    Promise.all([
      getResidentById(residentId),
      getResidentCurriculum(residentId),
    ])
      .then(([res, curriculum]) => {
        setResident(res);
        setModules(curriculum);
      })
      .catch((err) => setError(err.message || 'Failed to load resident progress'))
      .finally(() => setLoading(false));
  }, [residentId]);

  function toggleModule(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Overall stats
  const allTasks     = modules.flatMap((rm) => rm.tasks ?? []);
  const applicable   = allTasks.filter((t) => t.status !== 'not_applicable');
  const completedAll = applicable.filter((t) => t.status === 'completed').length;
  const totalAll     = applicable.length;
  const pctComplete  = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-slate-400">Loading…</p>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </AppLayout>
    );
  }

  const grouped = groupByYear(modules);
  const yearKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return Number(a) - Number(b);
  });

  return (
    <AppLayout>
      {/* Back link */}
      <button
        onClick={() => navigate(from)}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        {fromLabel}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'}
          </h1>
          {resident?.email && (
            <p className="mt-0.5 text-sm text-slate-500">{resident.email}</p>
          )}
        </div>
      </div>

      {/* Overall progress summary */}
      {totalAll > 0 && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall progress</span>
            <span className="text-sm text-slate-500">{completedAll} / {totalAll} tasks completed ({pctComplete}%)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${pctComplete}%` }}
            />
          </div>
        </div>
      )}

      {modules.length === 0 ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          No curriculum assigned to this resident yet.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {yearKeys.map((yearKey) => (
            <section key={yearKey}>
              <div className="mb-3 rounded-md bg-slate-800 px-4 py-2">
                <h2 className="text-sm font-semibold text-white">{yearLabel(yearKey)}</h2>
              </div>

              <div className="space-y-2">
                {grouped[yearKey].map((rm) => {
                  const isOpen = expanded.has(rm.id);
                  const { done, total } = taskProgress(rm.tasks);
                  const progress = moduleProgress(rm.tasks);

                  return (
                    <div key={rm.id} className="rounded-lg border border-slate-200 bg-white">
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(rm.id)}
                        className={`flex w-full flex-col px-4 py-3 text-left hover:bg-slate-50 rounded-t-lg${!isOpen ? ' rounded-b-lg' : ''}`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <svg
                              className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                            </svg>
                            <span className="truncate text-sm font-medium text-slate-900">
                              {rm.module?.name ?? 'Unnamed module'}
                            </span>
                          </div>
                          <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                            <span className="text-xs text-slate-500">{done} / {total} tasks</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MODULE_STATUS_BADGE[rm.status] ?? MODULE_STATUS_BADGE.not_started}`}>
                              {MODULE_STATUS_LABEL[rm.status] ?? rm.status}
                            </span>
                          </div>
                        </div>

                        {/* Stacked progress bar with tooltip */}
                        {progress && (
                          <div className="relative mt-2 group/bar">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                              {progress.completed > 0 && (
                                <div className="bg-green-500" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
                              )}
                              {progress.inProgress > 0 && (
                                <div className="bg-blue-400" style={{ width: `${(progress.inProgress / progress.total) * 100}%` }} />
                              )}
                              {progress.notStarted > 0 && (
                                <div className="bg-slate-200" style={{ width: `${(progress.notStarted / progress.total) * 100}%` }} />
                              )}
                              {progress.na > 0 && (
                                <div className="bg-slate-400" style={{ width: `${(progress.na / progress.total) * 100}%` }} />
                              )}
                            </div>
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover/bar:block">
                              <div className="rounded-lg bg-slate-800 px-3 py-2 shadow-lg">
                                <div className="space-y-1 whitespace-nowrap">
                                  {[
                                    { color: 'bg-green-500', label: 'Completed',   count: progress.completed },
                                    { color: 'bg-blue-400',  label: 'In progress', count: progress.inProgress },
                                    { color: 'bg-slate-300', label: 'Not started', count: progress.notStarted },
                                    { color: 'bg-slate-500', label: 'N/A',         count: progress.na },
                                  ]
                                    .filter((s) => s.count > 0)
                                    .map((s) => (
                                      <div key={s.label} className="flex items-center gap-2 text-xs text-white">
                                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${s.color}`} />
                                        <span>{Math.round((s.count / progress.total) * 100)}% {s.label.toLowerCase()}</span>
                                      </div>
                                    ))}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                        )}
                      </button>

                      {/* Expanded: description + task list (read-only) */}
                      {isOpen && (
                        <div className="overflow-hidden rounded-b-lg border-t border-slate-100">
                          {rm.module?.description && (
                            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                              <p className="text-sm text-slate-600 leading-relaxed">{rm.module.description}</p>
                            </div>
                          )}
                          {rm.tasks.length === 0 ? (
                            <p className="px-6 py-3 text-sm text-slate-400">No tasks in this module.</p>
                          ) : (
                            <ul className="divide-y divide-slate-50">
                              {rm.tasks.map((rt) => (
                                <li key={rt.id} className="px-4 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <span className={`mt-0.5 flex-shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize ${TASK_TYPE_BADGE[rt.task?.task_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {rt.task?.task_type === 'reading' ? 'Reading' : 'Clinical'}
                                      </span>
                                      <div className="min-w-0">
                                        <span className="text-sm text-slate-800 leading-snug">
                                          {rt.task?.name ?? 'Unnamed task'}
                                        </span>
                                        {rt.notes && (
                                          <p className="mt-1 text-xs text-slate-400 italic">{rt.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[rt.status] ?? TASK_STATUS_BADGE.not_started}`}>
                                      {TASK_STATUS_LABEL[rt.status] ?? rt.status}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
