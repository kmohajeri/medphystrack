import { useEffect, useState, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import {
  getMyCurriculum,
  updateTaskStatus,
  updateTaskNotes,
  updateModuleStatus,
} from '../../lib/api/residentPortal';

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_STATUS_OPTIONS = [
  { value: 'not_started',   label: 'Not Started' },
  { value: 'in_progress',   label: 'In Progress' },
  { value: 'completed',     label: 'Completed' },
  { value: 'not_applicable', label: 'N/A' },
];

const TASK_TYPE_BADGE = {
  clinical: 'bg-blue-50 text-blue-700',
  reading:  'bg-purple-50 text-purple-700',
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

function computeModuleStatus(tasks) {
  if (!tasks || tasks.length === 0) return 'not_started';
  const applicable = tasks.filter((t) => t.status !== 'not_applicable');
  if (applicable.length === 0) return 'not_started';
  const completed = applicable.filter((t) => t.status === 'completed').length;
  if (completed === applicable.length) return 'completed';
  if (applicable.some((t) => t.status !== 'not_started')) return 'in_progress';
  return 'not_started';
}

function taskProgress(tasks) {
  if (!tasks || tasks.length === 0) return { done: 0, total: 0 };
  const applicable = tasks.filter((t) => t.status !== 'not_applicable');
  const done = applicable.filter((t) => t.status === 'completed').length;
  return { done, total: applicable.length };
}

function moduleProgress(tasks) {
  if (!tasks || tasks.length === 0) return null;
  const total = tasks.length;
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
  if (key === 'unassigned') return 'Unassigned';
  return `Year ${key}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyCurriculumPage() {
  const [modules, setModules]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [expanded, setExpanded]         = useState(new Set());
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [savingTask, setSavingTask]     = useState(null); // residentTaskId
  const [savingModule, setSavingModule] = useState(null); // residentModuleId
  const [notesDraft, setNotesDraft]     = useState({});   // residentTaskId → string

  useEffect(() => {
    getMyCurriculum()
      .then((data) => {
        setModules(data);
        // Pre-populate notesDraft with existing notes
        const draft = {};
        for (const rm of data) {
          for (const rt of rm.tasks ?? []) {
            if (rt.notes) draft[rt.id] = rt.notes;
          }
        }
        setNotesDraft(draft);
      })
      .catch((err) => setError(err.message || 'Failed to load curriculum'))
      .finally(() => setLoading(false));
  }, []);

  function toggleModule(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleNotes(taskId) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  async function handleTaskStatusChange(residentModuleId, residentTaskId, newStatus) {
    setSavingTask(residentTaskId);
    try {
      await updateTaskStatus(residentTaskId, newStatus);

      // Update local state
      setModules((prev) =>
        prev.map((rm) => {
          if (rm.id !== residentModuleId) return rm;
          const updatedTasks = rm.tasks.map((rt) =>
            rt.id === residentTaskId ? { ...rt, status: newStatus } : rt
          );
          const newModuleStatus = computeModuleStatus(updatedTasks);
          // Auto-sync module status if it changed
          if (newModuleStatus !== rm.status) {
            updateModuleStatus(rm.id, newModuleStatus, rm.started_at).then((updated) => {
              setModules((prev2) =>
                prev2.map((rm2) =>
                  rm2.id === rm.id
                    ? { ...rm2, status: updated.status, started_at: updated.started_at, completed_at: updated.completed_at }
                    : rm2
                )
              );
            });
          }
          return { ...rm, tasks: updatedTasks };
        })
      );
    } catch {
      // revert by re-fetching is overkill; just leave the stale state
    } finally {
      setSavingTask(null);
    }
  }

  async function handleNotesSave(residentTaskId) {
    const notes = notesDraft[residentTaskId] ?? '';
    setSavingTask(residentTaskId);
    try {
      await updateTaskNotes(residentTaskId, notes);
      setModules((prev) =>
        prev.map((rm) => ({
          ...rm,
          tasks: rm.tasks.map((rt) =>
            rt.id === residentTaskId ? { ...rt, notes } : rt
          ),
        }))
      );
    } catch {
      // non-fatal
    } finally {
      setSavingTask(null);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-slate-400">Loading curriculum…</p>
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

  if (modules.length === 0) {
    return (
      <AppLayout>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">My Curriculum</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          No curriculum assigned yet. Your program director will assign it shortly.
        </div>
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
      <h1 className="text-xl font-semibold text-slate-900 mb-6">My Curriculum</h1>

      <div className="space-y-8">
        {yearKeys.map((yearKey) => (
          <section key={yearKey}>
            {/* Year header */}
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
                    {/* Module header row */}
                    <button
                      onClick={() => toggleModule(rm.id)}
                      className={`flex w-full flex-col px-4 py-3 text-left hover:bg-slate-50 rounded-t-lg${!isOpen ? ' rounded-b-lg' : ''}`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Chevron */}
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

                      {/* Stacked progress bar */}
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

                          {/* Hover tooltip */}
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

                    {/* Task list */}
                    {isOpen && (
                      <div className="overflow-hidden rounded-b-lg border-t border-slate-100">
                        {rm.module?.description && (
                          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                            <p className="text-sm text-slate-600 leading-relaxed">{rm.module.description}</p>
                          </div>
                        )}
                        {rm.tasks.length === 0 ? (
                          <p className="px-6 py-3 text-sm text-slate-400">No tasks in this module.</p>
                        ) : (
                          <ul className="divide-y divide-slate-50">
                            {rm.tasks.map((rt) => {
                              const notesOpen = expandedNotes.has(rt.id);
                              const isSaving = savingTask === rt.id;

                              return (
                                <li key={rt.id} className="px-4 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <span className={`mt-0.5 flex-shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize ${TASK_TYPE_BADGE[rt.task?.task_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {rt.task?.task_type === 'reading' ? 'Reading' : 'Clinical'}
                                      </span>
                                      <span className="text-sm text-slate-800 leading-snug">
                                        {rt.task?.name ?? 'Unnamed task'}
                                      </span>
                                    </div>

                                    <div className="flex flex-shrink-0 items-center gap-2">
                                      {isSaving && (
                                        <span className="text-xs text-slate-400">Saving…</span>
                                      )}
                                      <select
                                        value={rt.status}
                                        disabled={isSaving}
                                        onChange={(e) =>
                                          handleTaskStatusChange(rm.id, rt.id, e.target.value)
                                        }
                                        className="rounded-md border border-slate-300 py-1 pl-2 pr-7 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                      >
                                        {TASK_STATUS_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => toggleNotes(rt.id)}
                                        title={notesOpen ? 'Hide notes' : 'Add / view notes'}
                                        className={`rounded p-1 text-slate-400 hover:text-slate-600 ${rt.notes ? 'text-indigo-500 hover:text-indigo-700' : ''}`}
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Notes panel */}
                                  {notesOpen && (
                                    <div className="mt-2 pl-8">
                                      <textarea
                                        rows={2}
                                        value={notesDraft[rt.id] ?? ''}
                                        onChange={(e) =>
                                          setNotesDraft((prev) => ({ ...prev, [rt.id]: e.target.value }))
                                        }
                                        onBlur={() => handleNotesSave(rt.id)}
                                        placeholder="Add a note…"
                                        className="block w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                      />
                                      <p className="mt-1 text-xs text-slate-400">Saved on blur</p>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
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
    </AppLayout>
  );
}
