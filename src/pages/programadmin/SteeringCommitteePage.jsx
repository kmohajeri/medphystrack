import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/Spinner';
import { getProgramByOrgId } from '../../lib/api/programs';
import {
  listMembers, listMinutes, deleteMinutes,
} from '../../lib/api/committee';
import AddEditMemberModal from '../../components/modals/AddEditMemberModal';
import AddEditMinutesModal from '../../components/modals/AddEditMinutesModal';

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function SteeringCommitteePage() {
  const { profile } = useAuth();

  const [program,  setProgram]  = useState(null);
  const [members,  setMembers]  = useState([]);
  const [minutes,  setMinutes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('members'); // 'members' | 'minutes'

  // Member modal state
  const [memberModal,  setMemberModal]  = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Minutes modal state
  const [minutesModal,  setMinutesModal]  = useState(false);
  const [editingMinutes, setEditingMinutes] = useState(null);

  // Expanded minutes rows
  const [expanded, setExpanded] = useState(new Set());

  // Delete confirmation
  const [deletingMinutes, setDeletingMinutes] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramByOrgId(profile.org_id);
      setProgram(prog);
      const [mems, mins] = await Promise.all([
        listMembers(prog.id),
        listMinutes(prog.id),
      ]);
      setMembers(mems);
      setMinutes(mins);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDeleteMinutes(m) {
    setDeletingMinutes(m.id);
    setDeleteError(null);
    try {
      await deleteMinutes(m.id);
      await load();
    } catch (err) {
      setDeleteError(err.message || 'Delete failed');
    } finally {
      setDeletingMinutes(null);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Steering Committee</h1>
          {program && <p className="mt-1 text-sm text-slate-500">{program.name}</p>}
        </div>
        {!loading && program && (
          <button
            onClick={() => {
              if (tab === 'members') { setEditingMember(null); setMemberModal(true); }
              else { setEditingMinutes(null); setMinutesModal(true); }
            }}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {tab === 'members' ? 'Add member' : 'Add minutes'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {deleteError && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>
      )}

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'members', label: `Members${members.length ? ` (${members.length})` : ''}` },
            { id: 'minutes', label: `Minutes${minutes.length ? ` (${minutes.length})` : ''}` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <Spinner />
      ) : !program ? (
        <p className="mt-6 text-sm text-slate-500">No program found. Contact your Super Admin.</p>
      ) : tab === 'members' ? (
        <MembersTab
          members={members}
          onEdit={(m) => { setEditingMember(m); setMemberModal(true); }}
        />
      ) : (
        <MinutesTab
          minutes={minutes}
          expanded={expanded}
          onToggle={toggleExpand}
          onEdit={(m) => { setEditingMinutes(m); setMinutesModal(true); }}
          onDelete={handleDeleteMinutes}
          deletingId={deletingMinutes}
        />
      )}

      {/* Member modal */}
      {memberModal && program && (
        <AddEditMemberModal
          member={editingMember}
          orgId={profile.org_id}
          programId={program.id}
          onClose={() => { setMemberModal(false); setEditingMember(null); }}
          onSaved={() => { setMemberModal(false); setEditingMember(null); load(); }}
        />
      )}

      {/* Minutes modal */}
      {minutesModal && program && (
        <AddEditMinutesModal
          minutes={editingMinutes}
          members={members}
          orgId={profile.org_id}
          programId={program.id}
          onClose={() => { setMinutesModal(false); setEditingMinutes(null); }}
          onSaved={() => { setMinutesModal(false); setEditingMinutes(null); load(); }}
        />
      )}
    </AppLayout>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({ members, onEdit }) {
  const [filter, setFilter] = useState('active'); // 'active' | 'all'

  const activeCount = members.filter((m) => m.is_active).length;
  const visible     = filter === 'active' ? members.filter((m) => m.is_active) : members;

  if (members.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        No committee members yet. Click "Add member" to get started.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {/* Filter tabs */}
      <div className="mb-3 flex gap-2">
        {[
          { id: 'active', label: `Active (${activeCount})` },
          { id: 'all',    label: `All (${members.length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No inactive members.</p>
      ) : (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Start</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">End</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {visible.map((m) => (
            <tr key={m.id} className={!m.is_active ? 'opacity-60' : ''}>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{m.name}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{m.role || <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(m.start_date)}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(m.end_date)}</td>
              <td className="px-4 py-3 text-sm">
                {m.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(m)}
                  className="text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}

// ── Minutes Tab ───────────────────────────────────────────────────────────────

function MinutesTab({ minutes, expanded, onToggle, onEdit, onDelete, deletingId }) {
  if (minutes.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        No meeting minutes yet. Click "Add minutes" to get started.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {minutes.map((m) => {
        const isOpen = expanded.has(m.id);
        const attendees = (m.attendees ?? []).map((a) => a.member).filter(Boolean);

        return (
          <div key={m.id} className="rounded-lg border border-slate-200 bg-white">
            {/* Header row */}
            <button
              onClick={() => onToggle(m.id)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 rounded-t-lg${!isOpen ? ' rounded-b-lg' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <svg
                  className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-900">
                    {fmtDate(m.meeting_date)}
                  </span>
                  {m.title && (
                    <span className="ml-2 text-sm text-slate-500">— {m.title}</span>
                  )}
                </div>
              </div>
              <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                {attendees.length > 0 && (
                  <span className="text-xs text-slate-400">{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</span>
                )}
                {(m.files ?? []).length > 0 && (
                  <span className="text-xs text-slate-400">{m.files.length} file{m.files.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="overflow-hidden rounded-b-lg border-t border-slate-100">
                {/* Attendees */}
                {attendees.length > 0 && (
                  <div className="border-b border-slate-100 px-5 py-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Attendees</p>
                    <div className="flex flex-wrap gap-2">
                      {attendees.map((a) => (
                        <span key={a.id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                          {a.name}{a.role ? ` · ${a.role}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content */}
                {m.content && (
                  <div className="border-b border-slate-100 px-5 py-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{m.content}</p>
                  </div>
                )}

                {/* Files */}
                {(m.files ?? []).length > 0 && (
                  <div className="border-b border-slate-100 px-5 py-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Files</p>
                    <ul className="space-y-1">
                      {m.files.map((f) => (
                        <li key={f.id} className="text-sm text-indigo-600">
                          {f.file_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-5 py-3">
                  <button
                    onClick={() => onEdit(m)}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    disabled={deletingId === m.id}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === m.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
