import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listResidents, listArchivedResidents, assignCurriculum, inviteResident, archiveResident, restoreResident } from '../../lib/api/residents';
import AddEditResidentModal from '../../components/modals/AddEditResidentModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import Spinner from '../../components/Spinner';

const STATUS_BADGE = {
  active:    'bg-green-50 text-green-700',
  inactive:  'bg-slate-100 text-slate-600',
  graduated: 'bg-blue-50 text-blue-700',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ResidentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram]           = useState(null);
  const [residents, setResidents]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [showArchived, setShowArchived]   = useState(false);
  const [addOpen, setAddOpen]           = useState(false);
  const [editing, setEditing]           = useState(null);
  const [assigning, setAssigning]       = useState(null);
  const [assignError, setAssignError]   = useState(null);
  const [inviting, setInviting]         = useState(null);  // resident id being invited
  const [invitedSet, setInvitedSet]     = useState(new Set()); // ids sent this session
  const [inviteError, setInviteError]   = useState(null);
  const [archiving, setArchiving]       = useState(null);  // resident to confirm archive
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [restoring, setRestoring]       = useState(null);  // resident id being restored

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramByOrgId(profile.org_id);
      const data = showArchived
        ? await listArchivedResidents(prog.id)
        : await listResidents(prog.id);
      setProgram(prog);
      setResidents(data);
    } catch (err) {
      setError(err.message || 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleArchive() {
    if (!archiving) return;
    setArchiveLoading(true);
    try {
      await archiveResident(archiving.id);
      setArchiving(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to archive resident');
      setArchiving(null);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleRestore(residentId) {
    setRestoring(residentId);
    try {
      await restoreResident(residentId);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to restore resident');
    } finally {
      setRestoring(null);
    }
  }

  async function handleAssign(residentId) {
    setAssigning(residentId);
    setAssignError(null);
    try {
      await assignCurriculum(residentId);
      await load();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign curriculum');
    } finally {
      setAssigning(null);
    }
  }

  async function handleInvite(resident) {
    setInviting(resident.id);
    setInviteError(null);
    try {
      await inviteResident(resident.email);
      setInvitedSet((prev) => new Set([...prev, resident.id]));
    } catch (err) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setInviting(null);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Residents</h1>
          {program && <p className="mt-1 text-sm text-slate-500">{program.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
              showArchived
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
          {program && !showArchived && (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add resident
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {assignError && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{assignError}</div>
      )}
      {inviteError && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{inviteError}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <Spinner />
        ) : !program ? (
          <p className="p-6 text-sm text-slate-500">No program found. Contact your Super Admin.</p>
        ) : residents.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {showArchived ? 'No archived residents.' : 'No residents yet. Click "Add resident" to get started.'}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Portal</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Curriculum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {residents.map((r) => {
                const assigned    = r.resident_modules?.length > 0;
                const hasAccount  = !!r.user_id;
                const isAssigning = assigning === r.id;
                const isInviting  = inviting === r.id;
                const justInvited = invitedSet.has(r.id);
                const isRestoring = restoring === r.id;

                return (
                  <tr key={r.id} className={showArchived ? 'opacity-60' : undefined}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmt(r.start_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {showArchived ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : hasAccount ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : justInvited ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Invite sent
                        </span>
                      ) : r.status === 'active' ? (
                        <button
                          onClick={() => handleInvite(r)}
                          disabled={isInviting}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                        >
                          {isInviting ? 'Sending…' : 'Send invite'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {assigned ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {showArchived ? (
                          <button
                            onClick={() => handleRestore(r.id)}
                            disabled={isRestoring}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {isRestoring ? 'Restoring…' : 'Restore'}
                          </button>
                        ) : (
                          <>
                            {!assigned && r.status === 'active' && (
                              <button
                                onClick={() => handleAssign(r.id)}
                                disabled={isAssigning}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                              >
                                {isAssigning ? 'Assigning…' : 'Assign curriculum'}
                              </button>
                            )}
                            {assigned && (
                              <>
                                <button
                                  onClick={() => navigate(`/program-admin/residents/${r.id}`)}
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                  Progress
                                </button>
                                <button
                                  onClick={() => navigate(`/program-admin/residents/${r.id}/evaluations`)}
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                  Evaluations
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setEditing(r)}
                              className="text-sm font-medium text-slate-600 hover:text-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setArchiving(r)}
                              className="text-sm font-medium text-red-500 hover:text-red-700"
                            >
                              Archive
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && program && (
        <AddEditResidentModal
          programId={program.id}
          orgId={profile.org_id}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); load(); }}
        />
      )}

      {editing && program && (
        <AddEditResidentModal
          resident={editing}
          programId={program.id}
          orgId={profile.org_id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {archiving && (
        <DeleteConfirmModal
          title="Archive resident?"
          message={`${archiving.first_name} ${archiving.last_name}'s record will be hidden from the active list. Their curriculum data is preserved and can be restored at any time.`}
          confirmLabel="Archive"
          loading={archiveLoading}
          onConfirm={handleArchive}
          onClose={() => setArchiving(null)}
        />
      )}
    </AppLayout>
  );
}
