// src/pages/superadmin/ProgramsPage.jsx
import { useEffect, useState } from 'react';
import { listPrograms, deleteProgram } from '../../lib/api/programs';
import { listOrganizations } from '../../lib/api/organizations';
import CreateProgramModal from '../../components/modals/CreateProgramModal';
import AppLayout from '../../components/layout/AppLayout';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [orgsWithoutProgram, setOrgsWithoutProgram] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [programsData, orgsData] = await Promise.all([
        listPrograms(),
        listOrganizations(),
      ]);
      setPrograms(programsData);
      // programs.org_id is UNIQUE — only orgs with zero programs are
      // eligible for the "create program" flow
      setOrgsWithoutProgram(orgsData.filter((org) => !org.programs?.length));
    } catch (err) {
      setError(err.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreated() {
    setShowCreateModal(false);
    refresh();
  }

  async function handleDelete(program) {
    const confirmed = window.confirm(
      `Delete "${program.name}"? This removes all of its modules, tasks, residents, and records. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteProgram(program.id);
      refresh();
    } catch (err) {
      alert(err.message || 'Failed to delete program');
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Programs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Residency programs and their provisioned curriculum.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New program
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : programs.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No programs yet. Create an organization, then a program, to
            provision the stock curriculum.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Program
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {program.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {program.organizations?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(program.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(program)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateProgramModal
          organizations={orgsWithoutProgram}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </AppLayout>
  );
}
