import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/Spinner';
import { getProgramByOrgId } from '../../lib/api/programs';
import { listResidents } from '../../lib/api/residents';
import { listApplications } from '../../lib/api/applications';

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function ProgramAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const prog = await getProgramByOrgId(profile.org_id);
        const [residents, pendingApps] = await Promise.all([
          listResidents(prog.id),
          listApplications(prog.id, { status: 'pending' }),
        ]);
        const active = residents.filter(r => r.status === 'active').length;
        const assigned = residents.filter(r => r.resident_modules?.length > 0).length;
        setStats({
          programName: prog.name,
          totalResidents: residents.length,
          activeResidents: active,
          assignedResidents: assigned,
          pendingApplications: pendingApps.length,
        });
      } catch {
        // show dash on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {stats?.programName ?? 'Residency program overview'}
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Residents"
              value={stats?.totalResidents ?? '—'}
              sub={stats ? `${stats.activeResidents} active · ${stats.assignedResidents} with curriculum` : null}
            />
            <StatCard
              label="Pending Applications"
              value={stats?.pendingApplications ?? '—'}
              sub={stats?.pendingApplications > 0 ? 'Awaiting review' : 'No pending applications'}
            />
            <StatCard
              label="Program"
              value={stats?.programName ? '✓' : '—'}
              sub={stats?.programName ?? 'Not configured'}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/program-admin/residents')}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Manage residents →
            </button>
            {stats?.pendingApplications > 0 && (
              <button
                onClick={() => navigate('/program-admin/applications')}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Review applications →
              </button>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
