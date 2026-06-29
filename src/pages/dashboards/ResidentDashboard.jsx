import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getMyStats, getMyResident } from '../../lib/api/residentPortal';

export default function ResidentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyStats(), getMyResident().catch(() => null)])
      .then(([s, r]) => { setStats(s); setResident(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(d) {
    if (!d) return null;
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  const startFmt = fmtDate(resident?.start_date);
  const endFmt   = fmtDate(resident?.end_date);
  const dateLabel = startFmt && endFmt
    ? `${startFmt} – ${endFmt}`
    : startFmt
    ? `Started ${startFmt}`
    : null;

  const pct = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {dateLabel ?? 'Your residency curriculum progress'}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Modules Assigned"
              value={stats?.moduleCount ?? '—'}
            />
            <StatCard
              label="Tasks Completed"
              value={stats ? `${stats.completedTasks} / ${stats.totalTasks}` : '—'}
            />
            <StatCard
              label="Tasks Remaining"
              value={stats?.remainingTasks ?? '—'}
            />
          </div>

          {stats && stats.totalTasks > 0 && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Overall progress</p>
                <p className="text-sm font-semibold text-slate-900">{pct}%</p>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {stats && stats.moduleCount === 0 && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              No curriculum assigned yet. Your program director will assign it shortly.
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => navigate('/resident/curriculum')}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              View my curriculum →
            </button>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
