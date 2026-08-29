import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-5xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
