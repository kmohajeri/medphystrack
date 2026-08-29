import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/Spinner';
import { listOrganizations } from '../../lib/api/organizations';

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const orgs = await listOrganizations();
        setStats({
          orgCount: orgs.length,
          programCount: orgs.length, // 1:1 org-to-program invariant
        });
      } catch {
        // show dash on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Super Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide overview</p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Organizations"
              value={stats?.orgCount ?? '—'}
              sub="Active programs"
            />
            <StatCard
              label="Programs"
              value={stats?.programCount ?? '—'}
              sub="1 per organization"
            />
            <StatCard
              label="Template Modules"
              value={13}
              sub="CAMPEP curriculum"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/super-admin/organizations')}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Manage organizations →
            </button>
            <button
              onClick={() => navigate('/super-admin/programs')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View programs →
            </button>
          </div>
        </>
      )}
    </AppLayout>
  );
}
