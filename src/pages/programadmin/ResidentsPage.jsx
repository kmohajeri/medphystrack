import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listResidents, assignCurriculum } from '../../lib/api/residents';
import AddEditResidentModal from '../../components/modals/AddEditResidentModal';

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
  const [program, setProgram]       = useState(null);
  const [residents, setResidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [editing, setEditing]       = useState(null);
  const [assigning, setAssigning]   = useState(null); // resident id being assigned
  const [assignError, setAssignError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramByOrgId(profile.org_id);
      const data = await listResidents(prog.id);
      setProgram(prog);
      setResidents(data);
    } catch (err) {
      setError(err.message || 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Residents</h1>
          {program && <p className="mt-1 text-sm text-slate-500">{program.name}</p>}
        </div>
        {program && (
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add resident
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {assignError && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{assignError}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : !program ? (
          <p className="p-6 text-sm text-slate-500">No program found. Contact your Super Admin.</p>
        ) : residents.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No residents yet. Click "Add resident" to get started.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Curriculum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {residents.map((r) => {
                const assigned = r.resident_modules?.length > 0;
                const isAssigning = assigning === r.id;
                return (
                  <tr key={r.id}>
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
                        {!assigned && (
                          <button
                            onClick={() => handleAssign(r.id)}
                            disabled={isAssigning}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {isAssigning ? 'Assigning…' : 'Assign curriculum'}
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(r)}
                          className="text-sm font-medium text-slate-600 hover:text-slate-800"
                        >
                          Edit
                        </button>
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
    </AppLayout>
  );
}
