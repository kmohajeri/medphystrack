import AppLayout from '../../components/layout/AppLayout'

const STATS = ['Organizations', 'Programs', 'Total Users']

export default function SuperAdminDashboard() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-wide overview</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {STATS.map(label => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">—</p>
            <p className="mt-1 text-xs text-gray-400">Coming in a later phase</p>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
