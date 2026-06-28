import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listApplications, createApplication } from '../../lib/api/applications';
import ApplicationDetailModal from '../../components/modals/ApplicationDetailModal';

const TABS = [
  { label: 'All',      value: null },
  { label: 'Inquiry',  value: 'inquiry' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
];

const STATUS_BADGE = {
  inquiry:  'bg-slate-100 text-slate-600',
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
};

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicationsPage() {
  const { profile } = useAuth();
  const [program, setProgram]               = useState(null);
  const [applications, setApplications]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [activeTab, setActiveTab]           = useState(null);
  const [detailApp, setDetailApp]           = useState(null);

  // New application quick-form state
  const [showNew, setShowNew]               = useState(false);
  const [newFirst, setNewFirst]             = useState('');
  const [newLast, setNewLast]               = useState('');
  const [newEmail, setNewEmail]             = useState('');
  const [newNotes, setNewNotes]             = useState('');
  const [creating, setCreating]             = useState(false);
  const [createError, setCreateError]       = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramByOrgId(profile.org_id);
      const data = await listApplications(prog.id, { status: activeTab ?? undefined });
      setProgram(prog);
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e.preventDefault();
    if (!newFirst.trim() || !newLast.trim() || !newEmail.trim()) {
      setCreateError('First name, last name, and email are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createApplication({
        orgId: profile.org_id,
        programId: program.id,
        firstName: newFirst.trim(),
        lastName: newLast.trim(),
        email: newEmail.trim(),
        notes: newNotes.trim() || null,
      });
      setShowNew(false);
      setNewFirst(''); setNewLast(''); setNewEmail(''); setNewNotes('');
      await load();
    } catch (err) {
      setCreateError(err.message || 'Failed to create application');
      setCreating(false);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Applications</h1>
          {program && <p className="mt-1 text-sm text-slate-500">{program.name}</p>}
        </div>
        {program && (
          <button
            onClick={() => setShowNew(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New application
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* New application inline form */}
      {showNew && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">New application</h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First name</label>
                <input
                  type="text"
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                  required
                  disabled={creating}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last name</label>
                <input
                  type="text"
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                  required
                  disabled={creating}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  disabled={creating}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  disabled={creating}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>
            {createError && <p className="mb-2 text-sm text-red-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNew(false); setCreateError(null); }}
                disabled={creating}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : !program ? (
          <p className="p-6 text-sm text-slate-500">No program found. Contact your Super Admin.</p>
        ) : applications.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {activeTab ? `No ${activeTab} applications.` : 'No applications yet.'}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{app.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{fmt(app.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDetailApp(app)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailApp && program && (
        <ApplicationDetailModal
          application={detailApp}
          programId={program.id}
          onClose={() => setDetailApp(null)}
          onChanged={() => { load(); }}
        />
      )}
    </AppLayout>
  );
}
