import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getProgramByOrgId, getProgramCurriculum } from '../../lib/api/programs';
import { deleteModule, moveModule } from '../../lib/api/modules';
import { deleteTask, moveTask } from '../../lib/api/tasks';
import AddEditModuleModal from '../../components/modals/AddEditModuleModal';
import AddEditTaskModal from '../../components/modals/AddEditTaskModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';

const ICON = {
  chevronRight: 'M8.25 4.5l7.5 7.5-7.5 7.5',
  chevronUp:    'M4.5 15.75l7.5-7.5 7.5 7.5',
  chevronDown:  'M19.5 8.25l-7.5 7.5-7.5-7.5',
  plus:         'M12 4.5v15m7.5-7.5h-15',
};

function Icon({ d, className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function TypeBadge({ type }) {
  const isClinical = type === 'clinical';
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isClinical ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {isClinical ? 'Clinical' : 'Reading'}
    </span>
  );
}

export default function CurriculumPage() {
  const { profile } = useAuth();
  const [program, setProgram] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [deletingModule, setDeletingModule] = useState(null);
  const [deletingModuleLoading, setDeletingModuleLoading] = useState(false);

  const [addTaskModuleId, setAddTaskModuleId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingTaskLoading, setDeletingTaskLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramByOrgId(profile.org_id);
      const curriculum = await getProgramCurriculum(prog.id);
      setProgram(prog);
      setModules(curriculum);
    } catch (err) {
      setError(err.message || 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(moduleId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  }

  async function handleMoveModule(idx, direction) {
    const otherIdx = idx + direction;
    if (otherIdx < 0 || otherIdx >= modules.length) return;
    const mod = modules[idx];
    const other = modules[otherIdx];
    try {
      await moveModule(mod.id, other.id, mod.order_index, other.order_index);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to reorder modules');
    }
  }

  async function handleMoveTask(modIdx, taskIdx, direction) {
    const tasks = modules[modIdx].tasks;
    const otherIdx = taskIdx + direction;
    if (otherIdx < 0 || otherIdx >= tasks.length) return;
    const task = tasks[taskIdx];
    const other = tasks[otherIdx];
    try {
      await moveTask(task.id, other.id, task.order_index, other.order_index);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to reorder tasks');
    }
  }

  async function handleDeleteModule() {
    setDeletingModuleLoading(true);
    try {
      await deleteModule(deletingModule.id);
      setDeletingModule(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete module');
      setDeletingModule(null);
    } finally {
      setDeletingModuleLoading(false);
    }
  }

  async function handleDeleteTask() {
    setDeletingTaskLoading(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      setDeletingTask(null);
    } finally {
      setDeletingTaskLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Curriculum</h1>
          {program && (
            <p className="mt-1 text-sm text-slate-500">{program.name}</p>
          )}
        </div>
        {program && (
          <button
            onClick={() => setAddModuleOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Icon d={ICON.plus} />
            Add module
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !program ? (
          <p className="text-sm text-slate-500">
            No program has been set up for your organization yet. Contact your
            Super Admin to provision a program.
          </p>
        ) : modules.length === 0 ? (
          <p className="text-sm text-slate-500">
            No modules yet. Click "Add module" to get started.
          </p>
        ) : (
          (() => {
            // Build groups dynamically from whatever year values exist
            const distinctYears = [...new Set(modules.map(m => m.year).filter(Boolean))]
              .sort((a, b) => a - b);
            const groups = distinctYears.map(yr => ({
              key: String(yr),
              label: `Year ${yr}`,
              mods: modules.filter(m => m.year === yr),
            }));
            const unassigned = modules.filter(m => !m.year);
            if (unassigned.length > 0) {
              groups.push({ key: 'other', label: 'Unassigned', mods: unassigned });
            }

            return groups.map((group, groupIdx) => (
              <div key={group.key} className={groupIdx > 0 ? 'mt-8' : ''}>
                {/* Year section header */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {group.label}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    {group.mods.length} {group.mods.length === 1 ? 'module' : 'modules'}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.mods.map((mod) => {
                    // Always use the full-list index for reorder operations
                    const modIdx = modules.findIndex(m => m.id === mod.id);
                    const isExpanded = expanded.has(mod.id);
                    const taskCount = mod.tasks?.length ?? 0;
                    const meta = [
                      mod.duration_weeks ? `${mod.duration_weeks} weeks` : null,
                      `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`,
                    ].filter(Boolean).join(' · ');

                    return (
                      <div
                        key={mod.id}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                      >
                        {/* Module header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => toggleExpand(mod.id)}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-700"
                          >
                            <Icon d={isExpanded ? ICON.chevronDown : ICON.chevronRight} />
                          </button>

                          {/* Two-line name + metadata */}
                          <button
                            onClick={() => toggleExpand(mod.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {mod.name}
                            </span>
                            <span className="block mt-0.5 text-xs text-slate-500">
                              {meta}
                            </span>
                          </button>

                          <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                              onClick={() => handleMoveModule(modIdx, -1)}
                              disabled={modIdx === 0}
                              title="Move up"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Icon d={ICON.chevronUp} />
                            </button>
                            <button
                              onClick={() => handleMoveModule(modIdx, 1)}
                              disabled={modIdx === modules.length - 1}
                              title="Move down"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Icon d={ICON.chevronDown} />
                            </button>
                            <button
                              onClick={() => setEditingModule(mod)}
                              className="ml-1 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingModule(mod)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Tasks (expanded) */}
                        {isExpanded && (
                          <div className="border-t border-slate-100">
                            {mod.description && (
                              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed">{mod.description}</p>
                              </div>
                            )}
                            {taskCount === 0 ? (
                              <p className="px-12 py-3 text-sm text-slate-400">
                                No tasks in this module.
                              </p>
                            ) : (
                              <ul className="divide-y divide-slate-50">
                                {mod.tasks.map((task, taskIdx) => (
                                  <li
                                    key={task.id}
                                    className="flex items-center gap-3 px-12 py-2.5"
                                  >
                                    <TypeBadge type={task.task_type} />
                                    <span className="flex-1 min-w-0 truncate text-sm text-slate-800">
                                      {task.name}
                                    </span>
                                    {!task.is_required && (
                                      <span className="flex-shrink-0 text-xs text-slate-400">
                                        Elective
                                      </span>
                                    )}
                                    <div className="flex flex-shrink-0 items-center gap-1 ml-2">
                                      <button
                                        onClick={() => handleMoveTask(modIdx, taskIdx, -1)}
                                        disabled={taskIdx === 0}
                                        title="Move up"
                                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <Icon d={ICON.chevronUp} className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveTask(modIdx, taskIdx, 1)}
                                        disabled={taskIdx === mod.tasks.length - 1}
                                        title="Move down"
                                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <Icon d={ICON.chevronDown} className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingTask(task)}
                                        className="ml-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setDeletingTask(task)}
                                        className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="border-t border-slate-50 px-12 py-2.5">
                              <button
                                onClick={() => setAddTaskModuleId(mod.id)}
                                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                <Icon d={ICON.plus} className="h-3.5 w-3.5" />
                                Add task
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()
        )}
      </div>

      {/* Module modals */}
      {addModuleOpen && (
        <AddEditModuleModal
          programId={program?.id}
          onClose={() => setAddModuleOpen(false)}
          onSaved={() => { setAddModuleOpen(false); load(); }}
        />
      )}

      {editingModule && (
        <AddEditModuleModal
          programId={program?.id}
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSaved={() => { setEditingModule(null); load(); }}
        />
      )}

      {deletingModule && (
        <DeleteConfirmModal
          title="Delete module?"
          message={`"${deletingModule.name}" and all ${deletingModule.tasks?.length ?? 0} of its tasks will be permanently deleted.`}
          onConfirm={handleDeleteModule}
          onClose={() => setDeletingModule(null)}
          loading={deletingModuleLoading}
        />
      )}

      {/* Task modals */}
      {addTaskModuleId && (
        <AddEditTaskModal
          moduleId={addTaskModuleId}
          onClose={() => setAddTaskModuleId(null)}
          onSaved={() => { setAddTaskModuleId(null); load(); }}
        />
      )}

      {editingTask && (
        <AddEditTaskModal
          moduleId={null}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); load(); }}
        />
      )}

      {deletingTask && (
        <DeleteConfirmModal
          title="Delete task?"
          message={`"${deletingTask.name}" will be permanently deleted.`}
          onConfirm={handleDeleteTask}
          onClose={() => setDeletingTask(null)}
          loading={deletingTaskLoading}
        />
      )}
    </AppLayout>
  );
}
