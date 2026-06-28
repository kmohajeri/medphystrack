import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getOrganization } from '../../lib/api/organizations';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listResidents } from '../../lib/api/residents';

const STATUS_BADGE = {
  active:    'bg-green-50 text-green-700',
  inactive:  'bg-slate-100 text-slate-600',
  graduated: 'bg-blue-50 text-blue-700',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrgDetailPage() {
  const { orgId } = useParams();
  const navigate   = useNavigate();

  const [org, setOrg]           = useState(null);
  const [program, setProgram]   = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [orgData, progData] = await Promise.all([
          getOrganization(orgId),
          getProgramByOrgId(orgId).catch(() => null),
        ]);
        setOrg(orgData);
        setProgram(progData);
        if (progData) {
          const resData = await listResidents(progData.id);
          setResidents(resData);
        }
      } catch (err) {
        setError(err.message || 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/super-admin/organizations')}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Organizations
      </button>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : error ? (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{org?.name}</h1>
            {program ? (
              <p className="mt-0.5 text-sm text-slate-500">{program.name}</p>
            ) : (
              <p className="mt-0.5 text-sm text-amber-600">No program provisioned yet</p>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {!program ? (
              <p className="p-6 text-sm text-slate-500">
                No program has been provisioned for this organization.
              </p>
            ) : residents.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No residents in this program yet.</p>
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
                    const assigned   = r.resident_modules?.length > 0;
                    const hasAccount = !!r.user_id;
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
                          {hasAccount ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No account</span>
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
                          {assigned && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/super-admin/organizations/${orgId}/residents/${r.id}`,
                                  { state: { from: `/super-admin/organizations/${orgId}`, fromLabel: 'Back to Organization' } }
                                )
                              }
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Progress
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
