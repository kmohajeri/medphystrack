import AppLayout from '../../components/layout/AppLayout';

export default function HandbookPage() {
  return (
    <AppLayout>
      <h1 className="text-xl font-semibold text-slate-900">Handbook</h1>
      <p className="mt-1 text-sm text-slate-500">Program policies, procedures, and resources</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white px-6 py-8 text-center">
        <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.966 8.966 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
        <p className="mt-3 text-sm font-medium text-slate-700">No handbook available yet</p>
        <p className="mt-1 text-sm text-slate-400">Your program director will add the handbook here. Check back soon.</p>
      </div>
    </AppLayout>
  );
}
